import axios from "axios"
import { pool } from "../lib/db"
import { Request, Response, NextFunction } from "express"

import {
  defaultConfig,
  getUrlForFlow,
  isQuerySet,
  logger,
  redirectOnSoftError,
  RouteCreator,
  RouteRegistrator,
} from "../pkg"

import { UserAuthCard } from "@ory/elements-markup"

const KETO_BOOTSTRAP_URL =
  process.env.KETO_BOOTSTRAP_URL || "http://keto-bootstrap:4000"

// =====================================================
// GET REGISTRATION (FIXED — NO KETO CALL HERE ❌)
// =====================================================
export const createRegistrationRoute: RouteCreator =
  (createHelpers) => async (req, res, next) => {
    res.locals.projectName = "Create account"

    const {
      flow,
      return_to,
      after_verification_return_to,
      login_challenge,
      organization,
      identity_schema = "",
    } = req.query

    const { frontend, kratosBrowserUrl, logoUrl, extraPartials } =
      createHelpers(req, res)

    const initFlowQuery = new URLSearchParams({
      ...(return_to && { return_to: return_to.toString() }),
      ...(organization && { organization: organization.toString() }),
      ...(identity_schema && { identity_schema: identity_schema.toString() }),
      ...(after_verification_return_to && {
        after_verification_return_to:
          after_verification_return_to.toString(),
      }),
    })

    if (isQuerySet(login_challenge)) {
      initFlowQuery.append("login_challenge", login_challenge)
    }

    const initFlowUrl = getUrlForFlow(
      kratosBrowserUrl,
      "registration",
      initFlowQuery
    )

    if (!isQuerySet(flow)) {
      return res.redirect(303, initFlowUrl)
    }

    try {
      const { data: flowData } = await frontend.getRegistrationFlow({
        id: flow,
        cookie: req.header("Cookie"),
      })

      // ✅ Override form action
      flowData.ui.action = `/self-service/registration?flow=${flow}`

      // ❌ REMOVED: NO KETO CALL HERE (THIS CAUSED DUPLICATES)

      res.render("registration", {
        nodes: flowData.ui.nodes,
        card: UserAuthCard(
          {
            flow: flowData,
            flowType: "registration",
            cardImage: logoUrl,
          },
          { locale: res.locals.lang }
        ),
        extraPartial: extraPartials?.registration,
        extraContext: res.locals.extraContext,
      })
    } catch (err) {
      redirectOnSoftError(res, next, initFlowUrl)(err as any)
    }
  }

// =====================================================
// REGISTER ROUTES
// =====================================================
export const registerRegistrationRoute: RouteRegistrator = (
  app,
  createHelpers = defaultConfig
) => {
  app.get("/registration", createRegistrationRoute(createHelpers))

  app.post("/self-service/registration", async (req, res, next) => {
    try {
      const { flow } = req.query

      console.log("BODY:", req.body)

      // ===============================
      // GET TENANT NAME
      // ===============================
      const tenantName = req.body["traits.tenant_id"]

      if (!tenantName) {
        return res.status(400).send("Tenant not available")
      }

      // ===============================
      // DB LOOKUP
      // ===============================
      const result = await pool.query(
        "SELECT id FROM tenants WHERE name = $1",
        [tenantName]
      )

      if (!result.rows.length) {
        return res.status(400).send("Invalid tenant")
      }

      const tenantId = result.rows[0].id

      // ===============================
      // MODIFY REQUEST
      // ===============================
      req.body["traits.tenant_id"] = tenantId

      if (req.body["traits.roles"]) {
        req.body["traits.roles"] = [req.body["traits.roles"]][0]
      }

      req.body["method"] = "password"

      // ===============================
      // FIX URLSearchParams (NO IMPORT NEEDED)
      // ===============================
      const formData = new URLSearchParams()
      Object.keys(req.body).forEach((key) => {
        formData.append(key, req.body[key])
      })

      // ===============================
      // CALL KRATOS
      // ===============================
      await axios.post(
        `${process.env.KRATOS_PUBLIC_URL}/self-service/registration?flow=${flow}`,
        formData,
        {
          headers: {
            Cookie: req.header("Cookie"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )

      // ===============================
      // FETCH SESSION
      // ===============================
      const session = await axios
        .get(`${process.env.KRATOS_PUBLIC_URL}/sessions/whoami`, {
          headers: {
            Cookie: req.header("Cookie"),
          },
        })
        .catch(() => null)

      if (session?.data?.identity) {
        const identity = session.data.identity
        const userId = identity.id
        const tenantId = identity.traits?.tenant_id?.[0]

        // ===============================
        // 🔥 CHECK DB BEFORE KETO CALL
        // ===============================
        const exists = await pool.query(
          `
          SELECT 1 FROM tenant_users
          WHERE tenant_id = $1
            AND identity_id = $2
            AND role = $3
          LIMIT 1
          `,
          [tenantId, userId, "platform.admin"]
        )

        if (exists.rows.length === 0) {
          // ✅ ONLY CALL ONCE
          await axios.post(
            `${process.env.KETO_BOOTSTRAP_URL}/bootstrap/tenant`,
            {
              tenantId,
              userId,
            }
          )

          console.log("✅ Keto tuple created", { tenantId, userId })
        } else {
          console.log("⚠️ Relation already exists — skip Keto")
        }
      } else {
        console.warn("session not found after registration")
      }

      return res.redirect(303, "/welcome")
    } catch (err: any) {
      console.error("ERROR:", err.response?.data || err.message)

      if (err.response?.status === 400) {
        return res.redirect(`/registration?flow=${req.query.flow}`)
      }

      next(err)
    }
  })
}