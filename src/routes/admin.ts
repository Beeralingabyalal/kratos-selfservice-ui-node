import { RouteRegistrator } from "../pkg"
import requireAdmin from "../lib/requireAdmin.audit"
import { createTenant } from "../services/tenantService"
import express from "express"

export const registerAdminRoutes: RouteRegistrator = (router) => {
  router.post(
    "/api/admin/create-tenant",
    express.json(),
    requireAdmin(async (req: any, res: any) => {
      const { tenantName, ownerEmail } = req.body

      if (!tenantName || !ownerEmail) {
        return res.status(400).json({
          error: "tenantName and ownerEmail required",
        })
      }

      try {
        const result = await createTenant(tenantName, ownerEmail)
        return res.json({
          message: "Tenant created successfully",
          tenantId: result.tenantId,
          ownerIdentityId: result.ownerIdentityId,
        })
      } catch (err: any) {
        return res.status(500).json({ error: err.message })
      }
    }),
  )
}
