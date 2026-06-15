import { CookieOptions, Request, Response, Router } from "express"

import {
  hydraTokenUrl,
  oauthClientId,
  oauthClientSecret,
  oauthRedirectUri,
  oauthStateCookieName,
} from "../pkg/oauth"

type TokenResponse = {
  access_token?: string
  id_token?: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}

const cookieSecure =
  process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production"

const tokenCookieOptions = (expiresIn?: number): CookieOptions => ({
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: cookieSecure,
  ...(expiresIn && expiresIn > 0 ? { maxAge: expiresIn * 1000 } : {}),
})

const getSingleQueryValue = (
  value: Request["query"][string],
): string | undefined => {
  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0]
  }

  return undefined
}

const safeJson = async (response: globalThis.Response): Promise<TokenResponse> => {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text) as TokenResponse
  } catch {
    return {
      error: "invalid_token_response",
      error_description: text,
    }
  }
}

const clearTokenCookies = (res: Response) => {
  res.clearCookie("access_token", tokenCookieOptions())
  res.clearCookie("id_token", tokenCookieOptions())
  res.clearCookie("refresh_token", tokenCookieOptions())
}

export const registerCallbackRoute = (router: Router) => {
  router.get("/callback", async (req: Request, res: Response) => {
    const code = getSingleQueryValue(req.query.code)
    const state = getSingleQueryValue(req.query.state)
    const error = getSingleQueryValue(req.query.error)
    const errorDescription = getSingleQueryValue(req.query.error_description)
    const expectedState = req.cookies[oauthStateCookieName]

    console.log("OAUTH CALLBACK STATE:", {
      query: req.query,
      hasCode: Boolean(code),
      hasExpectedState: Boolean(expectedState),
      stateMatches: Boolean(state && expectedState && state === expectedState),
      error,
    })

    if (error) {
      console.error("OAuth callback returned an error:", {
        error,
        error_description: errorDescription,
      })

      res.clearCookie(oauthStateCookieName, tokenCookieOptions())
      clearTokenCookies(res)

      return res.status(400).json({
        error,
        error_description: errorDescription || "OAuth authorization failed",
      })
    }

    if (!code) {
      console.error("OAuth callback missing authorization code")

      res.clearCookie(oauthStateCookieName, tokenCookieOptions())
      clearTokenCookies(res)

      return res.status(400).json({
        error: "missing_code",
        error_description: "OAuth callback did not include a code parameter.",
      })
    }

    if (!state || !expectedState || state !== expectedState) {
      console.error("OAuth callback state mismatch:", {
        hasState: Boolean(state),
        hasExpectedState: Boolean(expectedState),
      })

      res.clearCookie(oauthStateCookieName, tokenCookieOptions())
      clearTokenCookies(res)

      return res.status(400).json({
        error: "invalid_state",
        error_description: "OAuth callback state did not match.",
      })
    }

    try {
      const basicAuth = Buffer.from(
        `${oauthClientId}:${oauthClientSecret}`,
      ).toString("base64")

      clearTokenCookies(res)

      const tokenResponse = await fetch(hydraTokenUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: oauthRedirectUri,
        }),
      })

      const tokenBody = await safeJson(tokenResponse)

      if (!tokenResponse.ok) {
        console.error("Hydra token exchange failed:", {
          status: tokenResponse.status,
          error: tokenBody.error,
          error_description: tokenBody.error_description,
        })

        res.clearCookie(oauthStateCookieName, tokenCookieOptions())
        clearTokenCookies(res)

        return res.status(400).json({
          error: tokenBody.error || "token_exchange_failed",
          error_description:
            tokenBody.error_description ||
            "Hydra rejected the authorization code exchange.",
        })
      }

      if (!tokenBody.access_token) {
        console.error("Hydra token response did not include access_token:", {
          token_type: tokenBody.token_type,
          scope: tokenBody.scope,
          hasIdToken: Boolean(tokenBody.id_token),
          hasRefreshToken: Boolean(tokenBody.refresh_token),
        })

        res.clearCookie(oauthStateCookieName, tokenCookieOptions())
        clearTokenCookies(res)

        return res.status(502).json({
          error: "invalid_token_response",
          error_description: "Hydra did not return an access token.",
        })
      }

      const cookieOptions = tokenCookieOptions(tokenBody.expires_in)

      res.clearCookie(oauthStateCookieName, tokenCookieOptions())
      res.cookie("access_token", tokenBody.access_token, cookieOptions)

      if (tokenBody.id_token) {
        res.cookie("id_token", tokenBody.id_token, cookieOptions)
      } else {
        res.clearCookie("id_token", tokenCookieOptions())
      }

      if (tokenBody.refresh_token) {
        res.cookie("refresh_token", tokenBody.refresh_token, {
          ...tokenCookieOptions(),
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
      } else {
        res.clearCookie("refresh_token", tokenCookieOptions())
      }

      console.log("Hydra token exchange succeeded:", {
        tokenType: tokenBody.token_type,
        expiresIn: tokenBody.expires_in,
        scope: tokenBody.scope,
        hasAccessToken: true,
        hasIdToken: Boolean(tokenBody.id_token),
        hasRefreshToken: Boolean(tokenBody.refresh_token),
      })

      return res.redirect("/")
    } catch (err) {
      console.error("OAuth token exchange crashed:", err)

      res.clearCookie(oauthStateCookieName, tokenCookieOptions())
      clearTokenCookies(res)

      return res.status(500).json({
        error: "token_exchange_failed",
        error_description: "Unable to exchange authorization code with Hydra.",
      })
    }
  })
}
