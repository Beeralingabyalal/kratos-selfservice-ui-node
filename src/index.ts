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
import protectedRouter from "./routes/protected"
import { csrfErrorHandler } from "./routes/csrfError"

const baseUrl = process.env.BASE_PATH || "/"

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
  secure: true,
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

registerAdminRoutes(router)

router.use(adminTenantDelete);
router.use(tenantRouter);
router.use(adminIdentityRouter);
router.use(adminIdentityList);
router.use(adminIdentityDelete);
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

router.get("/", (req: Request, res: Response) => {
  res.redirect(303, "welcome")
})

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
  app.listen(port, listener("http"))
}

export default app