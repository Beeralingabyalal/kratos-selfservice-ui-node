import express from "express";
import { requireJwt } from "../lib/requireJwt";
import { checkTenantAccess } from "../services/tenantAccess.service";

const router = express.Router();

router.post(
  "/api/tenant/access/check",
  express.json(),
  requireJwt,
  async (req: any, res) => {
    try {
      const identityId = req.jwt.sub;
      const { tenantId, action } = req.body;

      if (!tenantId || !action) {
        return res.status(400).json({
          error: "tenantId and action required",
        });
      }

      const allowed = await checkTenantAccess(
        tenantId,
        identityId,
        action
      );

      res.json({ allowed });
    } catch {
      res.status(500).json({
        error: "Keto access check failed",
      });
    }
  }
);

export default router;
