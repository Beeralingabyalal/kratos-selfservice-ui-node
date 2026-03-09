import { Router } from "express";
import { requireJwt } from "../lib/requireJwt";
import { updateKratosIdentity } from "../services/kratosClient";
import { syncKetoRoles } from "../services/ketoSync.service";
import { pool } from "../lib/db";

const router = Router();

router.put("/api/admin/identities/:id", requireJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, tenantIds, roles, newPassword } = req.body;

    if (!email || !Array.isArray(tenantIds) || !Array.isArray(roles)) {
      return res.status(400).json({
        error: "email, tenantIds[], roles[] required",
      });
    }

    // ✅ Convert tenant names → UUIDs
    const tenantUUIDs: string[] = [];

    for (const tenantName of tenantIds) {
      const result = await pool.query(
        "SELECT id FROM tenants WHERE name = $1",
        [tenantName]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          error: `Tenant not found: ${tenantName}`,
        });
      }

      tenantUUIDs.push(result.rows[0].id);
    }

    // ✅ 1️⃣ Update Kratos
    const identity = await updateKratosIdentity(id, {
      email,
      tenantIds: tenantUUIDs,
      roles,
      newPassword,
    });

    // ✅ 2️⃣ Remove old DB mappings
    await pool.query(
      "DELETE FROM tenant_users WHERE identity_id = $1",
      [id]
    );

    // ✅ 3️⃣ Insert new mappings
    for (const tenantUUID of tenantUUIDs) {
      for (const role of roles) {
        await pool.query(
          `
          INSERT INTO tenant_users (identity_id, tenant_id, role)
          VALUES ($1, $2, $3)
          `,
          [id, tenantUUID, role]
        );
      }
    }

    // ✅ 4️⃣ Sync Keto
    await syncKetoRoles(id, tenantUUIDs, roles);

    return res.json({
      message: "Identity updated + fully synced",
      identity,
    });

  } catch (err: any) {
    console.error("Identity update failed:", err.message);
    return res.status(500).json({
      error: "Identity update failed",
      details: err.message,
    });
  }
});

export default router;