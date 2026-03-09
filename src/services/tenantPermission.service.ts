import { query } from "../lib/db";

export async function grantTenantAccess(
  tenantId: string,
  identityId: string,
  role: string
) {
  await query(
    `
    INSERT INTO tenant_users (tenant_id, identity_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (tenant_id, identity_id, role)
    DO NOTHING
    `,
    [tenantId, identityId, role]
  );
}
