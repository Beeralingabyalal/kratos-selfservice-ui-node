// Copyright © 2022 Ory Corp
// SPDX-License-Identifier: Apache-2.0

import {
  defaultConfig,
  getUrlForFlow,
  isQuerySet,
  logger,
  redirectOnSoftError,
  RouteCreator,
  RouteRegistrator,
} from "../pkg"

import { LoginFlow } from "@ory/client"
import { UserAuthCard } from "@ory/elements-markup"
import path from "path"
import { URLSearchParams } from "url"
import rateLimit from "express-rate-limit"
// import router from "./tenant"

/* ---------------- RATE LIMITER ---------------- */

// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // max login attempts
//   standardHeaders: true,
//   legacyHeaders: false,
//   skip: (req) => Boolean(req.query.flow),
//   handler: (req, res) => {
//     res.status(429).send("Too many login attempts. Try again later.")
//   },
// })

/* ---------------- LOGIN ROUTE ---------------- */

export const createLoginRoute: RouteCreator =
  (createHelpers) => async (req, res, next) => {
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

    const initFlowQuery = new URLSearchParams({
      aal: aal.toString(),
      refresh: refresh.toString(),
      return_to: return_to.toString(),
      organization: organization.toString(),
      via: via.toString(),
    })

    if (isQuerySet(login_challenge)) {
      logger.debug("login_challenge found in URL query: ", { query: req.query })
      initFlowQuery.append("login_challenge", login_challenge)
    }

    if (isQuerySet(identity_schema)) {
      initFlowQuery.append("identity_schema", identity_schema)
    }

    const initFlowUrl = getUrlForFlow(kratosBrowserUrl, "login", initFlowQuery)

    if (!isQuerySet(flow)) {
      logger.debug("No flow ID found in URL query initializing login flow", {
        query: req.query,
      })
      res.redirect(303, initFlowUrl)
      return
    }

    const getLogoutUrl = async (loginFlow: LoginFlow) => {
      let logoutUrl = ""
      try {
        logoutUrl = await frontend
          .createBrowserLogoutFlow({
            cookie: req.header("cookie"),
            returnTo:
              (return_to && return_to.toString()) || loginFlow.return_to || "",
          })
          .then(({ data }) => data.logout_url)
        return logoutUrl
      } catch (err) {
        logger.error("Unable to create logout URL", { error: err })
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

    return frontend
      .getLoginFlow({ id: flow, cookie: req.header("cookie") })
      .then(async ({ data: flow }) => {
        if (flow.ui.messages && flow.ui.messages.length > 0) {
          if (flow.ui.messages.some(({ id }) => id === 4000010)) {
            return redirectToVerificationFlow(flow)
          }
        }

        const initRegistrationQuery = new URLSearchParams({
          return_to:
            (return_to && return_to.toString()) || flow.return_to || "",
        })

        const initRegistrationUrl = getUrlForFlow(
          kratosBrowserUrl,
          "registration",
          initRegistrationQuery,
        )

        let initRecoveryUrl = ""
        if (!flow.refresh) {
          initRecoveryUrl = getUrlForFlow(
            kratosBrowserUrl,
            "recovery",
            new URLSearchParams({
              return_to:
                (return_to && return_to.toString()) || flow.return_to || "",
            }),
          )
        }

        let logoutUrl: string | undefined = ""
        if (flow.requested_aal === "aal2" || flow.refresh) {
          logoutUrl = await getLogoutUrl(flow)
        }

        res.render("login", {
          nodes: flow.ui.nodes,
          card: UserAuthCard(
            {
              flow,
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

/* ---------------- REGISTER ROUTE ---------------- */

export const registerLoginRoute: RouteRegistrator = (
  router,
  createHelpers = defaultConfig,
) => {
  // router.use("/login", loginLimiter)
  router.get("/login", createLoginRoute(createHelpers))
}