import { query } from "../lib/db"
import { createKratosIdentity } from "./kratosClient"

export async function createTenant(tenantName: string, ownerEmail: string) {
  // create tenant row
  const result = await query(
    "INSERT INTO tenants(name) VALUES ($1) RETURNING id",
    [tenantName],
  )

  const tenantId = result.rows[0].id

  // create owner identity in Kratos
  const identity = await createKratosIdentity({
    email: ownerEmail,
    tenantId,
    roles: ["platform.admin"],
  })

  // Call Keto bootstrap service
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
