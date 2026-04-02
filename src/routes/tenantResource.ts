import express from "express";
import requireAdminAudit from "../lib/requireAdmin.audit";

const router = express.Router();

/**
 * ✅ Read resource — any tenant role allowed
 */
router.get(
  "/api/tenant/:tenantId/resource",
  requireAdminAudit(async (req, res) => {
    const { tenantId } = req.params;
    const actor = (req as any).actor;

    // 🔥 Tenant validation
    if (!actor.tenant_id || actor.tenant_id !== tenantId) {
      return res.status(403).json({ error: "Tenant access denied" });
    }

    return res.json({
      message: "Tenant protected resource access granted",
      tenantId,
      data: {
        reports: 5,
        users: 23,
        status: "active",
      },
    });
  })
);

/**
 * ✅ Admin-only action
 */
router.post(
  "/api/tenant/:tenantId/admin-action",
  requireAdminAudit(async (req, res) => {
    const { tenantId } = req.params;
    const actor = (req as any).actor;

    // 🔥 Tenant check
    if (!actor.tenant_id || actor.tenant_id !== tenantId) {
      return res.status(403).json({ error: "Tenant access denied" });
    }

    // 🔥 Role check
    if (!actor.roles.includes("platform.admin")) {
      return res.status(403).json({ error: "Admin role required" });
    }

    return res.json({
      message: "Tenant admin action allowed",
      tenantId,
    });
  })
);

export default router;