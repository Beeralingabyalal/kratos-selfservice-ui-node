import { Router, Request, Response } from "express";
import { withTransaction } from "../lib/db";
import { createKratosIdentity } from "../services/kratosClient";
import { syncKetoRoles } from "../services/ketoSync.service";

const router = Router();

/**
 * BOOTSTRAP TENANT (RUN ONCE)
 * NOT protected by requireAdmin
 */
router.post("/api/bootstrap/tenant", async (req: Request, res: Response) => {
  const { tenantName, ownerEmail, password } = req.body;

  if (!tenantName || !ownerEmail || !password) {
    return res.status(400).json({
      error: "tenantName, ownerEmail, password required",
    });
  }

  try {
    const result = await withTransaction(async (client) => {
      // 1️⃣ Create tenant
      const tenantRes = await client.query(
        "INSERT INTO tenants(name) VALUES ($1) RETURNING id",
        [tenantName]
      );

      const tenantId = tenantRes.rows[0].id;

      // 2️⃣ Create admin identity in Kratos
      const identity = await createKratosIdentity({
        email: ownerEmail,
        tenantId,
        roles: ["platform.admin"],
        password,
      });

      // 3️⃣ Insert mapping in tenant_users
      await client.query(
        `
        INSERT INTO tenant_users (tenant_id, identity_id, role)
        VALUES ($1, $2, $3)
        `,
        [tenantId, identity.id, "platform.admin"]
      );

      // 4️⃣ Sync Keto
      await syncKetoRoles(identity.id, [tenantId], ["platform.admin"]);

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
    return res.status(500).json({ error: err.message });
  }
});