// C:\Users\Kasetti User\Desktop\kratos-selfservice-ui-node\src\index.ts
// Copyright © 2022 Ory Corp
// SPDX-License-Identifier: Apache-2.0

import path from "path"
import dotenv from "dotenv"
import helmet from "helmet"
import rateLimit from "express-rate-limit"

import express, { Request, Response } from "express"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import { DoubleCsrfCookieOptions, doubleCsrf } from "csrf-csrf"
import { engine } from "express-handlebars"
import * as fs from "fs"
import * as https from "https"

dotenv.config({
  path: path.join(process.cwd(), ".env"),
})

import {
  addFavicon,
  defaultConfig,
  detectLanguage,
  getKratosSessionLookup,
  persistKratosSessionToken,
  handlebarsHelpers,
} from "./pkg"

import { logger, middleware as middlewareLogger } from "./pkg/logger"
import tenantResourceRouter from "./routes/tenantResource";
import tenantAccessCheckRouter from "./routes/tenantAccessCheck";

import {
  register404Route,
  register500Route,
  registerConsentRoute,
  registerErrorRoute,
  registerHealthRoute,
  registerLoginRoute,
  registerRecoveryRoute,
  registerRegistrationRoute,
  registerSessionsRoute,
  registerSettingsRoute,
  registerStaticRoutes,
  registerVerificationRoute,
  registerWelcomeRoute,
  registerLogoutRoute,
} from "./routes"
import { registerAdminRoutes } from "./routes/admin"
import relationTupleWrapper from "./routes/relationTupleWrapper";
import tenantRouter from "./routes/tenant"
import adminIdentityRouter from "./routes/admin.identity";
import adminIdentityUpdate from "./routes/admin.identity.update"
import { registerSessionExportRoute } from "./routes/sessionExport"
import adminIdentityList from "./routes/admin.identity.list";
import adminIdentityDelete from "./routes/admin.identity.delete";
import adminTenantDelete from "./routes/admin.tenant.delete"
import { registerCallbackRoute } from "./routes/callback";
import protectedRouter from "./routes/protected"
import { csrfErrorHandler } from "./routes/csrfError"
import bootstrapRouter from "./routes/bootstrap"

const baseUrl = process.env.BASE_PATH || "/"
const cookieSecure =
  process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production"

const app = express()
const router = express.Router()

/* ---------------- RATE LIMITER ---------------- */

// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // 5 attempts per IP
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: (req, res) => {
//     return res.status(429).send("Too many login attempts. Try again later.")
//   },
// })

/* ---------------- Security ---------------- */

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "http:", "https:"],
        fontSrc: ["'self'", "data:"],
        formAction: ["'self'", "http://localhost:4433"]
      },
    },
  })
)

/* ---------------- CSRF ---------------- */

const cookieOptions: DoubleCsrfCookieOptions = {
  sameSite: "lax",
  signed: true,
  secure: false,
}

const cookieName = process.env.CSRF_COOKIE_NAME || "__Host-ax-x-csrf-token"
const cookieSecret = process.env.CSRF_COOKIE_SECRET

const { invalidCsrfTokenError, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => cookieSecret || "",
  cookieName,
  cookieOptions,
  ignoredMethods: ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"],
  getTokenFromRequest: (req: Request) => req.body._csrf,
})

/* ---------------- Middleware ---------------- */

app.use(middlewareLogger)
app.use(cookieParser(process.env.COOKIE_SECRET || ""))
app.use(addFavicon(defaultConfig))
app.use(detectLanguage)
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: false }))

/* ---------------- View Engine ---------------- */

app.set("view engine", "hbs")

app.engine(
  "hbs",
  engine({
    extname: "hbs",
    layoutsDir: `${__dirname}/../views/layouts/`,
    partialsDir: `${__dirname}/../views/partials/`,
    defaultLayout: "auth",
    helpers: handlebarsHelpers,
  })
)

/* ---------------- Routes ---------------- */
router.use(protectedRouter)
registerStaticRoutes(router)
registerHealthRoute(router)

registerLoginRoute(router)
registerRecoveryRoute(router)
registerRegistrationRoute(router)
registerSettingsRoute(router)
registerVerificationRoute(router)
registerSessionsRoute(router)
registerSessionExportRoute(router)
registerWelcomeRoute(router)
registerErrorRoute(router)
registerCallbackRoute(router)
registerAdminRoutes(router)

router.use(adminTenantDelete);
router.use(tenantRouter);
router.use(adminIdentityRouter);
router.use(adminIdentityList);
router.use(adminIdentityDelete);
router.use(bootstrapRouter);
router.use(tenantResourceRouter);
router.use(relationTupleWrapper);
router.use(tenantAccessCheckRouter);
router.use(adminIdentityUpdate);
/* ---------------- Consent / Logout ---------------- */

router.use("/consent", doubleCsrfProtection)
router.use("/consent", csrfErrorHandler(invalidCsrfTokenError))
registerConsentRoute(router)

router.use("/logout", doubleCsrfProtection)
router.use("/logout", csrfErrorHandler(invalidCsrfTokenError))
registerLogoutRoute(router)

/* ---------------- Root ---------------- */

// router.get("/", async(req, res) => {
//   const challenge = req.cookies.login_challenge;

//   console.log("ROOT HIT - challenge:", challenge);

//   if (challenge) {
//     try {
//       const { frontend, oauth2 } = defaultConfig(req, res);

//       const whoami = await frontend.toSession({
//         cookie: req.headers.cookie || "",
//       }).catch(() => null);

//       console.log("WHOAMI ROOT:", whoami?.data);

//       if (whoami?.data?.identity) {
//         const identity = whoami.data.identity;

//         console.log("🔥 ACCEPTING HYDRA IN ROOT:", identity.id);

//         const accept = await oauth2.acceptOAuth2LoginRequest({
//           loginChallenge: String(challenge),
//           acceptOAuth2LoginRequest: {
//             subject: identity.id,
//           },
//         });
        
//         console.log("HYDRA REDIRECT:", accept.data.redirect_to);

//         res.clearCookie("login_challenge");

//         return res.redirect(String(accept.data.redirect_to));
//       } else {
//         console.log("❌ NO SESSION IN ROOT");
//       }
//     } catch (err) {
//       console.error("HYDRA ROOT ERROR:", err);
//     }
//   }

//   // return res.redirect(303, "welcome");
//     return res.send("No oauth flow")
// });

router.get("/", async (req, res) => {
  console.log("ROOT HIT", req.query)

  persistKratosSessionToken(req, res)

  if (req.query.code || req.query.error) {
    const callbackQuery = new URLSearchParams()

    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") {
        callbackQuery.set(key, value)
      }
    }

    return res.redirect(`/callback?${callbackQuery.toString()}`)
  }

  const { frontend } = defaultConfig(req, res)
  const whoami = await frontend
    .toSession(getKratosSessionLookup(req))
    .catch(() => null)

  const hasKratosSession = Boolean(whoami?.data?.identity)
  const hasAccessToken = Boolean(req.cookies.access_token)

  console.log("ROOT AUTH STATE:", {
    hasKratosSession,
    hasAccessToken,
  })

  if (!hasKratosSession && hasAccessToken) {
    console.log("ROOT CLEARING STALE APP TOKENS")
    const cookieOptions = {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: cookieSecure,
    }

    res.clearCookie("access_token", cookieOptions)
    res.clearCookie("id_token", cookieOptions)
    res.clearCookie("refresh_token", cookieOptions)
  }

  if (hasKratosSession && hasAccessToken) {
    return res.redirect("/welcome")
  }

  if (hasKratosSession && !hasAccessToken) {
    return res.redirect("/login?oauth_start=1")
  }

  return res.redirect("/login")
})

// router.get("/oauth/start", (req, res) => {
//   return res.redirect(
//     "http://localhost:4444/oauth2/auth" +
//       "?client_id=20822a9f-fc3f-4d20-85f2-0cf5393c00cf" +
//       "&response_type=code" +
//       "&scope=openid%20offline" +
//       "&redirect_uri=http://localhost:3000/callback" +
//       "&state=secure123456789"
//   )
// })


register404Route(router)
register500Route(router)

app.use(baseUrl, router)

/* ---------------- Server Start ---------------- */

const port = Number(process.env.PORT) || 3000

const listener = (proto: "http" | "https") => () => {
  logger.info(`Listening on ${proto}://0.0.0.0:${port}`)
}

if (process.env.TLS_CERT_PATH && process.env.TLS_KEY_PATH) {
  const options = {
    cert: fs.readFileSync(process.env.TLS_CERT_PATH),
    key: fs.readFileSync(process.env.TLS_KEY_PATH),
  }

  https.createServer(options, app).listen(port, listener("https"))
} else {
  app.listen(port, "0.0.0.0", listener("http"))
}

export default app
