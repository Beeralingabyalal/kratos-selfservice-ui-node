import { withTransaction } from "../lib/db";
import { addUserToTenantRelation } from "./tenantAccess.service";

export type TenantRow = {
  id: string;
  name: string;
};

export async function createMultipleTenants(
  tenantNames: string[],
  identityId: string
): Promise<TenantRow[]> {
  return withTransaction(async (client) => {
    const tenants: TenantRow[] = [];

    for (const name of tenantNames) {
      // 1️⃣ Create tenant (idempotent)
      const insert = await client.query(
        `
        INSERT INTO tenants (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
        RETURNING id, name
        `,
        [name]
      );

      // 2️⃣ Get tenant row (new or existing)
      const tenant: TenantRow =
        insert.rows[0] ??
        (
          await client.query(
            `SELECT id, name FROM tenants WHERE name = $1`,
            [name]
          )
        ).rows[0];

      // 3️⃣ Ensure DB mapping (idempotent)
      await client.query(
        `
        INSERT INTO tenant_users (tenant_id, identity_id, role)
        VALUES ($1, $2, 'platform.admin')
        ON CONFLICT (tenant_id, identity_id) DO NOTHING
        `,
        [tenant.id, identityId]
      );

      // 4️⃣ Ensure Keto relation (idempotent by design)
      await addUserToTenantRelation(
        tenant.id,
        identityId,
        "platform.admin"
      );

      tenants.push(tenant);
    }

    return tenants;
  });
}
