import { Router } from "express";
import { requireJwt } from "../lib/requireJwt";
import { pool } from "../lib/db";
import axios from "axios";
import {
  getKratosIdentity,
  updateKratosIdentity,
} from "../services/kratosClient";

const router = Router();

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://localhost:4467";

router.delete(
  "/api/admin/tenants/:name",
  requireJwt,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { name } = req.params;

      await client.query("BEGIN");

      // 1️⃣ Get tenant UUID
      const tenantRes = await client.query(
        "SELECT id FROM tenants WHERE name = $1",
        [name]
      );

      if (tenantRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "Tenant not found",
        });
      }

      const tenantId = tenantRes.rows[0].id;

      console.log("🗑️ Deleting tenant:", name, tenantId);

      // 2️⃣ Get identities linked to this tenant
      const identityRes = await client.query(
        "SELECT identity_id FROM tenant_users WHERE tenant_id = $1",
        [tenantId]
      );

      const affectedIdentities = identityRes.rows.map(
        (row) => row.identity_id
      );

      // 3️⃣ Remove tenant from Kratos identities
      for (const identityId of affectedIdentities) {
        const identity = await getKratosIdentity(identityId);

        const updatedTenants =
          identity.traits.tenant_id?.filter(
            (t: string) => t !== tenantId
          ) || [];

        await updateKratosIdentity(identityId, {
          email: identity.traits.email,
          tenantIds: updatedTenants,
          roles: identity.traits.roles || [],
        });

        console.log(
          `🔄 Removed tenant from identity ${identityId}`
        );
      }

      // 4️⃣ Delete Keto tuples for this tenant
      await axios.delete(
        `${KETO_ADMIN_URL}/admin/relation-tuples`,
        {
          params: {
            namespace: "tenant",
            object: tenantId,
          },
        }
      );

      console.log("🗑️ Deleted Keto tuples for tenant:", tenantId);

      // 5️⃣ Delete tenant_users relations
      await client.query(
        "DELETE FROM tenant_users WHERE tenant_id = $1",
        [tenantId]
      );

      // 6️⃣ Delete tenant
      await client.query(
        "DELETE FROM tenants WHERE id = $1",
        [tenantId]
      );

      await client.query("COMMIT");

      return res.json({
        message: "Tenant deleted successfully (fully synced)",
      });

    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("Tenant delete failed:", err.message);

      return res.status(500).json({
        error: "Tenant delete failed",
        details: err.message,
      });
    } finally {
      client.release();
    }
  }
);

export default router;