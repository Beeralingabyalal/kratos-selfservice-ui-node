CREATE TABLE IF NOT EXISTS tenant_users (
  id SERIAL PRIMARY KEY,
  identity_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT tenant_users_identity_tenant_unique UNIQUE (tenant_id, identity_id),
  CONSTRAINT tenant_users_tenant_identity_role_unique UNIQUE (tenant_id, identity_id, role)
);
