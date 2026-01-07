import axios from "axios"
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
}