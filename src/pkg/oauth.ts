const appBaseUrl = process.env.APP_PUBLIC_URL || "http://localhost:3000"
const hydraPublicUrl = process.env.HYDRA_PUBLIC_URL || "http://localhost:4444"

export const appPublicUrl = appBaseUrl.replace(/\/$/, "")
export const hydraPublicBaseUrl = hydraPublicUrl.replace(/\/$/, "")
export const oauthClientId =
  process.env.HYDRA_CLIENT_ID || "20822a9f-fc3f-4d20-85f2-0cf5393c00cf"
export const oauthClientSecret = process.env.HYDRA_CLIENT_SECRET || "secret"
export const oauthRedirectUri =
  process.env.HYDRA_REDIRECT_URI || `${appPublicUrl}/callback`
export const oauthScope = process.env.HYDRA_SCOPE || "openid offline_access"
export const oauthStateCookieName =
  process.env.HYDRA_STATE_COOKIE_NAME || "hydra_oauth_state"

export const hydraTokenUrl = `${hydraPublicBaseUrl}/oauth2/token`

export const buildHydraAuthorizeUrl = (state: string) => {
  const url = new URL(`${hydraPublicBaseUrl}/oauth2/auth`)

  url.searchParams.set("client_id", oauthClientId)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", oauthScope)
  url.searchParams.set("redirect_uri", oauthRedirectUri)
  url.searchParams.set("state", state)
  url.searchParams.set("prompt", "login")
  url.searchParams.set("max_age", "0")

  return url.toString()
}
