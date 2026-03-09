import { query } from "../lib/db";

export async function syncTenantUsers(
  identityId: string,
  tenantIds: string[],
  roles: string[]
) {
  await query("DELETE FROM tenant_users WHERE identity_id = $1", [identityId]);

  for (const tenantId of tenantIds) {
    for (const role of roles) {
      await query(
        `INSERT INTO tenant_users(identity_id, tenant_id, role)
         VALUES ($1,$2,$3)`,
        [identityId, tenantId, role]
      );
    }
  }
}

export async function deleteTenantUsers(identityId: string) {
  await query(
    "DELETE FROM tenant_users WHERE identity_id = $1",
    [identityId]
  );
}
