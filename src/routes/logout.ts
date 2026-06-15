// Copyright © 2023 Ory Corp
// SPDX-License-Identifier: Apache-2.0

import { UserLogoutCard } from "@ory/elements-markup"
import { CookieOptions, NextFunction, Request, Response } from "express"

import {
  clearPersistedKratosSessionToken,
  RouteCreator,
  RouteRegistrator,
  defaultConfig,
  logger,
  setSession,
} from "../pkg"
import { oauthStateCookieName } from "../pkg/oauth"

const cookieSecure =
  process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production"

const appCookieOptions: CookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: cookieSecure,
}

const clearAppCookies = (res: Response) => {
  res.clearCookie("access_token", appCookieOptions)
  res.clearCookie("id_token", appCookieOptions)
  res.clearCookie("refresh_token", appCookieOptions)
  res.clearCookie("login_challenge", appCookieOptions)
  res.clearCookie(oauthStateCookieName, appCookieOptions)
  clearPersistedKratosSessionToken(res)
}

const destroyStoredSession = async (req: Request) => {
  const maybeSession = (req as Request & {
    session?: { destroy?: (callback: (err?: Error) => void) => void }
  }).session as
    | { destroy?: (callback: (err?: Error) => void) => void }
    | undefined

  if (!maybeSession?.destroy) {
    return
  }

  const destroy = maybeSession.destroy

  await new Promise<void>((resolve, reject) => {
    destroy((err?: Error) => {
      if (err) {
        reject(err)
        return
      }

      resolve()
    })
  })
}

const redirectAfterLocalCleanup = async (
  createHelpers: any,
  req: Request,
  res: Response,
) => {
  clearAppCookies(res)

  try {
    await destroyStoredSession(req)
  } catch (err) {
    logger.warn("Unable to destroy local Express session", { error: err })
  }

  try {
    const { frontend } = createHelpers(req, res)
    const logoutFlow = await frontend.createBrowserLogoutFlow({
      cookie: req.header("cookie") || "",
      returnTo: `${process.env.APP_PUBLIC_URL || "http://localhost:3000"}/login`,
    })

    console.log("KRATOS LOGOUT REDIRECT:", logoutFlow.data.logout_url)
    return res.redirect(logoutFlow.data.logout_url)
  } catch (err) {
    console.error("LOGOUT ERROR:", err)
    return res.redirect("/login")
  }
}

export const createShowLogoutRoute: RouteCreator =
  (createHelpers) =>
  async (req: Request, res: Response, next: NextFunction) => {
    res.locals.projectName = "Logout"

    const { logout_challenge: logoutChallenge } = req.query

    if (typeof logoutChallenge !== "string") {
      logger.debug("No Hydra logout challenge; performing full local logout.")
      return redirectAfterLocalCleanup(createHelpers, req, res)
    }

    const { oauth2, shouldSkipLogoutConsent } = createHelpers(req, res)

    return oauth2
      .getOAuth2LogoutRequest({ logoutChallenge })
      .then(({ data: body }) => {
        if (shouldSkipLogoutConsent(body)) {
          return oauth2
            .acceptOAuth2LogoutRequest({ logoutChallenge })
            .then(async ({ data: accepted }) => {
              clearAppCookies(res)
              await destroyStoredSession(req).catch((err) => {
                logger.warn("Unable to destroy local Express session", {
                  error: err,
                })
              })

              console.log("Accepted Hydra logout request:", {
                redirectTo: accepted.redirect_to,
              })

              return res.redirect(accepted.redirect_to)
            })
        }

        if (!req.csrfToken) {
          next(new Error("Expected CSRF token middleware to be set."))
          return
        }

        return res.render("logout", {
          card: UserLogoutCard({
            csrfToken: req.csrfToken(true),
            challenge: logoutChallenge,
            action: "logout",
          }),
        })
      })
      .catch((err) => {
        logger.warn("Hydra logout handling failed; falling back.", {
          error: err,
        })
        return redirectAfterLocalCleanup(createHelpers, req, res)
      })
  }

export const createSubmitLogoutRoute: RouteCreator =
  (createHelpers) =>
  async (req: Request, res: Response) => {
    const { oauth2 } = createHelpers(req, res)

    res.locals.projectName = "Logout"

    const { challenge: logoutChallenge, submit } = req.body

    if (submit === "No") {
      logger.debug("User rejected logout.")

      return oauth2
        .rejectOAuth2LogoutRequest({ logoutChallenge })
        .then(() => res.redirect("/welcome"))
        .catch(() => res.redirect("/welcome"))
    }

    logger.debug("User accepted logout.")

    return oauth2
      .acceptOAuth2LogoutRequest({ logoutChallenge })
      .then(async ({ data: body }) => {
        clearAppCookies(res)
        await destroyStoredSession(req).catch((err) => {
          logger.warn("Unable to destroy local Express session", { error: err })
        })

        return res.redirect(body.redirect_to)
      })
      .catch(() => redirectAfterLocalCleanup(createHelpers, req, res))
  }

export const registerLogoutRoute: RouteRegistrator = (
  app,
  createHelpers = defaultConfig,
) => {
  app.get(
    "/logout",
    setSession(createHelpers),
    createShowLogoutRoute(createHelpers),
  )

  app.post(
    "/logout",
    setSession(createHelpers),
    createSubmitLogoutRoute(createHelpers),
  )
}
