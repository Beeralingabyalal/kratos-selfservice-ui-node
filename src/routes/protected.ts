import { Router } from "express";
import { requireJwt } from "../lib/requireJwt";
import { checkTenantAccess } from "../services/permission.service";

const router = Router();

router.get("/api/protected", requireJwt, async (req: any, res) => {
  const tenantId = req.query.tenant as string;
  const subject = req.jwt.sub;       // ✅ identity id
  const role = req.jwt.role;         // ✅ role from JWT

  console.log("CHECK:", subject, tenantId, role);

  const allowed = await checkTenantAccess(subject, tenantId, role);

  if (!allowed) {
    return res.status(403).json({
      error: "Forbidden — no tenant access",
    });
  }

  res.json({
    message: "Protected resource access granted",
  });
});

export default router;
