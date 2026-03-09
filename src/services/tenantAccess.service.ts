import axios from "axios";
import { pool } from "../lib/db"
import { query } from "../lib/db";

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://localhost:4467";

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://localhost:4466";

export type UserTenant = {
  tenantId: string;
  tenantName: string;
  role: string;
};

//
// ✅ DB — list user tenants
//
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

//
// ✅ Keto — write relation tuple
//
export async function addUserToTenantRelation(
  tenantId: string,
  identityId: string,
  role: string
) {
  try {
    await axios.put(
      `${KETO_ADMIN_URL}/admin/relation-tuples`,
      {
        namespace: "tenant",
        object: tenantId,
        relation: role,
        subject_id: identityId,   // correct for Keto v0.11
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("✅ Keto relation created");
  } catch (err: any) {
    console.error(
      "Keto relation failed:",
      err.response?.data || err.message
    );
    throw err;
  }
}

//
// ✅ Keto — access check (READ API)
//
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
