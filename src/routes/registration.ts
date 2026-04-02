import axios from "axios"
import { pool } from "../lib/db";
import { Request, Response, NextFunction } from "express";


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
import { URLSearchParams } from "url"

const KETO_BOOTSTRAP_URL =
  process.env.KETO_BOOTSTRAP_URL || "http://keto-bootstrap:4000"

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
        after_verification_return_to: after_verification_return_to.toString(),
      }),
    })

    if (isQuerySet(login_challenge)) {
      initFlowQuery.append("login_challenge", login_challenge)
    }

    const initFlowUrl = getUrlForFlow(
      kratosBrowserUrl,
      "registration",
      initFlowQuery,
    )

    // :repeat: Initialize registration flow
    if (!isQuerySet(flow)) {
      return res.redirect(303, initFlowUrl)
    }

    try {
      // :one: Load registration flow
      const { data: flowData } = await frontend.getRegistrationFlow({
        id: flow,
        cookie: req.header("Cookie"),
      })

      // 🔥 OVERRIDE FORM ACTION TO YOUR BACKEND
      flowData.ui.action = `/self-service/registration?flow=${flow}`;

      // :two: Try to fetch session (exists only AFTER successful registration)
      const sessionResponse = await frontend
        .toSession({ cookie: req.header("Cookie") })
        .catch(() => null)

      if (sessionResponse?.data?.identity) {
        const identity = sessionResponse.data.identity
        const userId = identity.id
        const tenantId = identity.traits?.tenant_id?.[0]

        if (!tenantId) {
          throw new Error("tenant_id missing in identity traits")
        }

        // :three: CALL KETO BOOTSTRAP :white_check_mark:
        await axios.post(`${KETO_BOOTSTRAP_URL}/bootstrap/tenant`, {
          tenantId,
          userId,
        })

        logger.info(":white_check_mark: Keto tuple created automatically", {
          tenantId,
          userId,
        })

        // :four: Redirect after successful registration
        return res.redirect(303, "/welcome")
      }

      // :five: Render registration UI (before submit)
      res.render("registration", {
        nodes: flowData.ui.nodes,
        card: UserAuthCard(
          {
            flow: flowData,
            flowType: "registration",
            cardImage: logoUrl,
          },
          { locale: res.locals.lang },
        ),
        extraPartial: extraPartials?.registration,
        extraContext: res.locals.extraContext,
      })
    } catch (err) {
      redirectOnSoftError(res, next, initFlowUrl)(err as any)
    }
  }

export const registerRegistrationRoute: RouteRegistrator = (
  app,
  createHelpers = defaultConfig,
) => {
  app.get("/registration", createRegistrationRoute(createHelpers))

  app.post("/self-service/registration", async (req, res, next) => {
  try {
    const { flow } = req.query

    console.log("BODY:", req.body)

    // 🔥 Treat tenant_id as tenant name
    const tenantName = req.body["traits.tenant_id"]

    if (!tenantName) {
      return res.status(400).send("Tenant not available")
    }

    // 🔥 DB lookup
    const result = await pool.query(
      "SELECT id FROM tenants WHERE name = $1",
      [tenantName]
    )

    if (!result.rows.length) {
      return res.status(400).send("Invalid tenant")
    }

    const tenantId = result.rows[0].id

    // 🔥 Replace with UUID
    req.body["traits.tenant_id"] = tenantId

    // 🔥 Fix roles
    if (req.body["traits.roles"]) {
      req.body["traits.roles"] = [req.body["traits.roles"]][0]
    }

    // 🔥 Ensure method exists
    req.body["method"] = "password"

    // 🔥 Convert properly
    const formData = new URLSearchParams()
    Object.keys(req.body).forEach((key) => {
      formData.append(key, req.body[key])
    })

    // 🔥 Send to Kratos
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

    const session = await axios
    .get(`${process.env.KRATOS_PUBLIC_URL}/sessions/whomi`,{
      headers:{
        Cookie: req.header("Cookie"),
      },
    })
    .catch(() => null)

    if (session?.data?.identity){
      const identity =session.data.identity
      const userId = identity.id
      const tenantId = identity.traits?.tenant_id?.[0]

      await axios.post(`${process.env.KETO_BOOTSTRAP_URL}/bootstrap/tenant`,{
        tenantId,
        userId
      })
      console.log("keto tuple created",{ tenantId, userId })
      }else{
        console.warn("session not found after registration")
      }
    

    // ✅ SUCCESS → redirect manually
    return res.redirect(303, "/welcome")

  } catch (err: any) {
    console.error("ERROR:", err.response?.data || err.message)

    // 🔥 If Kratos returns validation error → show UI again
    if (err.response?.status === 400) {
      return res.redirect(`/registration?flow=${req.query.flow}`)
    }

    next(err)
  }
})
}