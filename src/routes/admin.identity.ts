import { Router } from "express";
import { requireJwt } from "../lib/requireJwt";
import { createKratosIdentity, updateKratosIdentity } from "../services/kratosClient";
import { syncKetoRoles } from "../services/ketoSync.service";
import { pool } from "../lib/db";

const router = Router();

router.post("/api/admin/identities", requireJwt, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, tenantId, roles, password } = req.body;

    if (!email || !tenantId || !Array.isArray(roles) || !password) {
      return res.status(400).json({
        error: "email, tenantId(s), roles[], password required",
      });
    }

    await client.query("BEGIN");

    // ✅ Normalize to array
    const tenantNames = Array.isArray(tenantId)
      ? tenantId
      : [tenantId];

    const tenantUUIDs: string[] = [];

    for (const name of tenantNames) {
      const result = await client.query(
        "SELECT id FROM tenants WHERE name = $1",
        [name]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          error: `Tenant not found: ${name}`,
        });
      }

      tenantUUIDs.push(result.rows[0].id);
    }

    // ✅ 1️⃣ Create identity with first tenant
    let identity = await createKratosIdentity({
      email,
      tenantId: tenantUUIDs[0],
      roles,
      password,
    });

    // ✅ 2️⃣ If multiple tenants → update identity
    if (tenantUUIDs.length > 1) {
      identity = await updateKratosIdentity(identity.id, {
        email,
        tenantIds: tenantUUIDs,
        roles,
      });
    }

    // ✅ 3️⃣ Insert into tenant_users (SOURCE OF TRUTH)
    for (const tenantUUID of tenantUUIDs) {
      for (const role of roles) {
        const result = await client.query(
          `
          INSERT INTO tenant_users (identity_id, tenant_id, role)
          VALUES ($1, $2, $3)
          ON CONFLICT (tenant_id, identity_id, role) DO NOTHING
          `,
          [identity.id, tenantUUID, role]
        );

      console.log("Tenant mapping sync", identity.id, tenantUUIDs, roles, "rows effected:", result.rowCount);

      }
    }


    // ✅ 4️⃣ Sync Keto
    await syncKetoRoles(identity.id, tenantUUIDs, roles);

    await client.query("COMMIT");
    return res.json({
      message: "Kratos identity created",
      identity,
    });

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Identity create failed:", err.message);
    return res.status(500).json({
      error: "Kratos identity creation failed",
      details: err.message,
    });
  }
  finally {
    client.release();
  }
});

export default router;