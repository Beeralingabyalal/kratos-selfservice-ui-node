// Copyright © 2022 Ory Corp
// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from "crypto"
import { LoginFlow } from "@ory/client"
import { UserAuthCard } from "@ory/elements-markup"
import { CookieOptions, Request, Response } from "express"
import path from "path"

import {
  defaultConfig,
  getUrlForFlow,
  isQuerySet,
  logger,
  getKratosSessionLookup,
  persistKratosSessionToken,
  redirectOnSoftError,
  RouteCreator,
  RouteRegistrator,
} from "../pkg"
import {
  appPublicUrl,
  buildHydraAuthorizeUrl,
  oauthStateCookieName,
} from "../pkg/oauth"

const cookieSecure =
  process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production"

const transientCookieOptions: CookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: cookieSecure,
}

const clearTokenCookies = (res: Response) => {
  res.clearCookie("access_token", transientCookieOptions)
  res.clearCookie("id_token", transientCookieOptions)
  res.clearCookie("refresh_token", transientCookieOptions)
}

const renderClientRedirect = (res: Response, redirectTo: string, label = "Continue") => {
  res.setHeader("Cache-Control", "no-store")

  return res.status(200).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0;url=${redirectTo}">
    <title>Redirecting</title>
  </head>
  <body>
    <script>window.location.replace(${JSON.stringify(redirectTo)})</script>
    <a href="${redirectTo}">${label}</a>
  </body>
</html>`)
}

const startFreshHydraAuthorization = (res: Response) => {
  const state = randomBytes(32).toString("hex")
  const hydraAuthorizeUrl = buildHydraAuthorizeUrl(state)

  clearTokenCookies(res)
  res.cookie(oauthStateCookieName, state, {
    ...transientCookieOptions,
    maxAge: 10 * 60 * 1000,
  })

  console.log("STARTING FRESH HYDRA OAUTH:", {
    hydraAuthorizeUrl,
    statePresent: true,
  })

  return renderClientRedirect(res, hydraAuthorizeUrl)
}

export const createLoginRoute: RouteCreator =
  (createHelpers) => async (req: Request, res: Response, next) => {
    res.locals.projectName = "Sign in"

    const {
      flow,
      aal = "",
      refresh = "",
      return_to = "",
      organization = "",
      via = "",
      login_challenge,
      identity_schema,
    } = req.query

    const { frontend, kratosBrowserUrl, logoUrl, extraPartials } =
      createHelpers(req, res)

    persistKratosSessionToken(req, res)

    const hydraLoginChallenge = isQuerySet(login_challenge)
      ? String(login_challenge)
      : req.cookies.login_challenge
        ? String(req.cookies.login_challenge)
        : ""

    const whoami = await frontend
      .toSession(getKratosSessionLookup(req))
      .catch(() => null)

    const kratosIdentity = whoami?.data?.identity
    const hasKratosSession = Boolean(kratosIdentity)
    const hasAccessToken = Boolean(req.cookies.access_token)
    const shouldStartOauth = req.query.oauth_start === "1"

    console.log("LOGIN ROUTE STATE:", {
      flow: isQuerySet(flow) ? String(flow) : "",
      oauth_start: req.query.oauth_start,
      hasKratosSession,
      hasAccessToken,
      hydraLoginChallenge: Boolean(hydraLoginChallenge),
    })

    if (!hasKratosSession && hasAccessToken) {
      console.log("CLEARING STALE APP TOKENS: Kratos session missing")
      clearTokenCookies(res)
    }

    if (hydraLoginChallenge && kratosIdentity) {
      const { oauth2 } = createHelpers(req, res)

      try {
        const accept = await oauth2.acceptOAuth2LoginRequest({
          loginChallenge: hydraLoginChallenge,
          acceptOAuth2LoginRequest: {
            subject: kratosIdentity.id,
            remember: false,
          },
        })

        console.log("Accepted Hydra login challenge:", {
          subject: kratosIdentity.id,
          loginChallengePresent: true,
          redirectTo: accept.data.redirect_to,
        })

        res.clearCookie("login_challenge", transientCookieOptions)
        return res.redirect(String(accept.data.redirect_to))
      } catch (err) {
        console.error("Failed to accept Hydra login challenge:", err)
        return next(err)
      }
    }

    if (hasKratosSession && shouldStartOauth && !hydraLoginChallenge && !isQuerySet(flow)) {
      return startFreshHydraAuthorization(res)
    }

    if (hasKratosSession && hasAccessToken && !hydraLoginChallenge && !isQuerySet(flow)) {
      return res.redirect(303, "/welcome")
    }

    const loginReturnTo = hydraLoginChallenge
      ? `${appPublicUrl}/login?login_challenge=${encodeURIComponent(
          hydraLoginChallenge,
        )}`
      : return_to.toString() || `${appPublicUrl}/login?oauth_start=1`

    const initFlowQuery = new URLSearchParams({
      aal: aal.toString(),
      refresh: refresh.toString(),
      return_to: loginReturnTo,
      organization: organization.toString(),
      via: via.toString(),
    })

    if (isQuerySet(login_challenge)) {
      logger.debug("login_challenge found in URL query", { query: req.query })
      initFlowQuery.append("login_challenge", login_challenge)
    }

    if (isQuerySet(identity_schema)) {
      initFlowQuery.append("identity_schema", identity_schema)
    }

    const initFlowUrl = getUrlForFlow(kratosBrowserUrl, "login", initFlowQuery)

    if (!isQuerySet(flow) && !hydraLoginChallenge && !hasKratosSession) {
      console.log("INITIALIZING KRATOS LOGIN FLOW:", initFlowUrl)
      return res.redirect(303, initFlowUrl)
    }

    const getLogoutUrl = async (loginFlow: LoginFlow) => {
      try {
        return await frontend
          .createBrowserLogoutFlow({
            cookie: req.header("cookie"),
            returnTo:
              (return_to && return_to.toString()) || loginFlow.return_to || "",
          })
          .then(({ data }) => data.logout_url)
      } catch (err) {
        logger.error("Unable to create logout URL", { error: err })
        return ""
      }
    }

    const redirectToVerificationFlow = (loginFlow: LoginFlow) => {
      frontend
        .createBrowserVerificationFlow({
          returnTo:
            (return_to && return_to.toString()) || loginFlow.return_to || "",
        })
        .then(({ headers, data: verificationFlow }) => {
          if (headers["set-cookie"]) {
            res.setHeader("set-cookie", headers["set-cookie"])
          }

          const verificationParameters = new URLSearchParams({
            flow: verificationFlow.id,
            message: JSON.stringify(loginFlow.ui.messages),
          })

          res.redirect(
            303,
            path.join(
              req.baseUrl,
              "verification?" + verificationParameters.toString(),
            ),
          )
        })
        .catch(
          redirectOnSoftError(
            res,
            next,
            getUrlForFlow(
              kratosBrowserUrl,
              "verification",
              new URLSearchParams({
                return_to:
                  (return_to && return_to.toString()) ||
                  loginFlow.return_to ||
                  "",
              }),
            ),
          ),
        )
    }

    if (typeof flow !== "string") {
      return res.redirect(303, initFlowUrl)
    }

    return frontend
      .getLoginFlow({ id: flow, cookie: req.header("cookie") })
      .then(async ({ data: loginFlow }) => {
        if (
          loginFlow.ui.messages &&
          loginFlow.ui.messages.some(({ id }) => id === 4000010)
        ) {
          return redirectToVerificationFlow(loginFlow)
        }

        const initRegistrationQuery = new URLSearchParams({
          return_to:
            (return_to && return_to.toString()) || loginFlow.return_to || "",
        })

        if (loginFlow.identity_schema) {
          initRegistrationQuery.set(
            "identity_schema",
            loginFlow.identity_schema.toString(),
          )
        }

        if (loginFlow.oauth2_login_request?.challenge) {
          initRegistrationQuery.set(
            "login_challenge",
            loginFlow.oauth2_login_request.challenge,
          )
        }

        const initRegistrationUrl = getUrlForFlow(
          kratosBrowserUrl,
          "registration",
          initRegistrationQuery,
        )

        let initRecoveryUrl = ""
        if (!loginFlow.refresh) {
          initRecoveryUrl = getUrlForFlow(
            kratosBrowserUrl,
            "recovery",
            new URLSearchParams({
              return_to:
                (return_to && return_to.toString()) ||
                loginFlow.return_to ||
                "",
            }),
          )
        }

        let logoutUrl = ""
        if (loginFlow.requested_aal === "aal2" || loginFlow.refresh) {
          logoutUrl = await getLogoutUrl(loginFlow)
        }

        return res.render("login", {
          nodes: loginFlow.ui.nodes,
          card: UserAuthCard(
            {
              flow: loginFlow,
              flowType: "login",
              cardImage: logoUrl,
              additionalProps: {
                forgotPasswordURL: initRecoveryUrl,
                signupURL: initRegistrationUrl,
                logoutURL: logoutUrl,
                loginURL: initFlowUrl,
              },
            },
            { locale: res.locals.lang },
          ),
          extraPartial: extraPartials?.login,
          extraContext: res.locals.extraContext,
        })
      })
      .catch(redirectOnSoftError(res, next, initFlowUrl))
  }

export const registerLoginRoute: RouteRegistrator = (
  router,
  createHelpers = defaultConfig,
) => {
  router.get("/login", createLoginRoute(createHelpers))
}
