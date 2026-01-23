import { query } from "../lib/db"
import { createKratosIdentity } from "./kratosClient"
import { addUserToTenant } from "./tenant.service"

const KETO_BOOTSTRAP_URL =
  process.env.KETO_BOOTSTRAP_URL || "http://localhost:5001"

/* ✅ Strong type */
type KratosIdentity = {
  id: string
  traits?: any
}

export async function createTenant(
  tenantName: string,
  ownerEmail: string
) {

  // 1️⃣ create tenant row
  const result = await query(
    "INSERT INTO tenants(name) VALUES ($1) RETURNING id",
    [tenantName],
  )

  const tenantId = result.rows[0].id

  // 2️⃣ create owner identity in Kratos
  const identityRaw = await createKratosIdentity({
    email: ownerEmail,
    tenantId,
    roles: ["platform.admin"],
  })

  const identity = identityRaw as KratosIdentity   // 👈 FIX

  // 3️⃣ Create Keto relation tuple  
  await addUserToTenant(tenantId, identity.id)

  // 4️⃣ Call Keto bootstrap service
  await fetch("http://localhost:5001/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId,
      ownerIdentityId: identity.id
    })
  })

  return {
    tenantId,
    ownerIdentityId: identity.id,
  }
}
