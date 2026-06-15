import { Router, Request, Response } from "express";
import { withTransaction } from "../lib/db";
import { createKratosIdentity } from "../services/kratosClient";
import { syncKetoRoles } from "../services/ketoSync.service";

const router = Router();

router.post("/api/bootstrap/tenant", async (req: Request, res: Response) => {
  const { tenantName, ownerEmail, password } = req.body;

  if (!tenantName || !ownerEmail || !password) {
    return res.status(400).json({
      error: "tenantName, ownerEmail, password required",
    });
  }

  try {
    const result = await withTransaction(async (client) => {
      console.log("[bootstrap] start", { tenantName, ownerEmail });

      const tenantRes = await client.query(
        "INSERT INTO tenants(name) VALUES ($1) RETURNING id",
        [tenantName]
      );

      const tenantId = tenantRes.rows[0].id;
      console.log("[bootstrap] tenant inserted", { tenantId });

      const identity = await createKratosIdentity({
        email: ownerEmail,
        tenantId,
        roles: ["platform.admin"],
        password,
      });
      console.log("[bootstrap] kratos identity ready", {
        identityId: identity.id,
      });

      await client.query(
        `
        INSERT INTO tenant_users (tenant_id, identity_id, role)
        VALUES ($1, $2, $3)
        `,
        [tenantId, identity.id, "platform.admin"]
      );
      console.log("[bootstrap] tenant_users inserted", {
        tenantId,
        identityId: identity.id,
      });

      await syncKetoRoles(identity.id, [tenantId], ["platform.admin"]);
      console.log("[bootstrap] keto sync complete", {
        tenantId,
        identityId: identity.id,
      });

      return {
        tenantId,
        ownerIdentityId: identity.id,
      };
    });

    return res.json({
      message: "Bootstrap tenant created",
      ...result,
    });
  } catch (err: any) {
    console.error("[bootstrap] failed", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
