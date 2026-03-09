import { Router } from "express";
import requireAdmin from "../lib/requireAdmin.audit";
import { getUserTenants } from "../services/tenantAccess.service";

const router = Router();

router.get(
  "/api/my/tenants",
  requireAdmin(async (req: any, res) => {
    const identityId = req.actor.id;

    const tenants = await getUserTenants(identityId);

    res.json({
      count: tenants.length,
      tenants,
    });
  })
);

export default router;
