import express from "express";
import { requireJwt } from "../lib/requireJwt";
import { requireTenantAccess } from "../lib/requireTenantAccess";

const router = express.Router();

/**
 * ✅ Read resource — any tenant role allowed
 */
router.get(
  "/api/tenant/:tenantId/resource",
  requireJwt,
  requireTenantAccess("platform.admin", [
    "platform.admin",
    "tenant.admin",
    "tenant.user",
  ]),
  async (req, res) => {
    const { tenantId } = req.params;

    res.json({
      message: "Tenant protected resource access granted",
      tenantId,
      data: {
        reports: 5,
        users: 23,
        status: "active",
      },
    });
  }
);

/**
 * ✅ Admin-only action
 */
router.post(
  "/api/tenant/:tenantId/admin-action",
  requireJwt,
  requireTenantAccess("platform.admin", [
    "platform.admin",
    "tenant.admin",
  ]),
  async (req, res) => {
    res.json({
      message: "Tenant admin action allowed",
    });
  }
);

export default router;
