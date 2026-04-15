import axios from "axios";
import { pool, query } from "../lib/db";

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://localhost:4467";

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://localhost:4466";

export type UserTenant = {
  tenantId: string;
  tenantName: string;
  role: string;
};

// ===============================
// DB — list user tenants
// ===============================
export async function getUserTenants(
  identityId: string
): Promise<UserTenant[]> {
  const result = await query(
    `
    SELECT
      t.id   AS "tenantId",
      t.name AS "tenantName",
      tu.role
    FROM tenant_users tu
    JOIN tenants t ON t.id = tu.tenant_id
    WHERE tu.identity_id = $1
    ORDER BY t.created_at
    `,
    [identityId]
  );

  return result.rows;
}

// ===============================
// CHECK IF TUPLE EXISTS IN KETO
// ===============================
async function tupleExists(
  tenantId: string,
  identityId: string,
  role: string
): Promise<boolean> {
  const res = await axios.get(`${KETO_READ_URL}/relation-tuples`, {
    params: {
      namespace: "tenant",
      object: tenantId,
      relation: role,
      subject_id: identityId,
    },
  });

  return res.data.relation_tuples?.length > 0;
}

// ===============================
// CREATE RELATION (IDEMPOTENT)
// ===============================
export async function addUserToTenantRelation(
  tenantId: string,
  identityId: string,
  role: string
) {
  try {
    // ✅ INSERT FIRST (atomic protection)
    await pool.query(
      `
      INSERT INTO tenant_users (tenant_id, identity_id, role)
      VALUES ($1, $2, $3)
      `,
      [tenantId, identityId, role]
    );

    console.log("✅ DB insert success");

  } catch (err: any) {
    // ✅ UNIQUE constraint hit → already exists
    if (err.code === "23505") {
      console.log("⚠️ Already exists (DB constraint)");
      return "exists";
    }

    throw err;
  }

  // ✅ Only AFTER DB success → write to Keto
  try {
    await axios.put(
      `${KETO_ADMIN_URL}/admin/relation-tuples`,
      {
        namespace: "tenant",
        object: tenantId,
        relation: role,
        subject_id: identityId,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("✅ Keto relation created");
    return "created";

  } catch (err: any) {
    // OPTIONAL: rollback DB if Keto fails
    console.error("❌ Keto failed:", err.response?.data || err.message);

    // rollback (optional but recommended)
    await pool.query(
      `
      DELETE FROM tenant_users
      WHERE tenant_id = $1
        AND identity_id = $2
        AND role = $3
      `,
      [tenantId, identityId, role]
    );

    throw err;
  }
}

// ===============================
// ACCESS CHECK (DB)
// ===============================
export async function checkTenantAccess(
  tenantId: string,
  subject: string,
  role: string
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM tenant_users
      WHERE tenant_id = $1
        AND identity_id = $2
        AND role = $3
      LIMIT 1
    `,
    [tenantId, subject, role]
  );

  return result.rows.length > 0;
}