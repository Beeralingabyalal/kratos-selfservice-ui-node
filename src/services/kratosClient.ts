import fetch from "node-fetch"

const KRATOS_ADMIN_URL =
  process.env.KRATOS_ADMIN_URL || "http://localhost:4434"

export async function createKratosIdentity({
  email,
  tenantId,
  roles,
}: {
  email: string
  tenantId: string
  roles: string[]
}) {
  const payload = {
    schema_id: "default",
    traits: {
      email,
      tenant_id: [tenantId],
      roles,
    },
    credentials: {
      password: {
        config: {
          password: "Temp1234!",
        },
      },
    },
  }

  const res = await fetch(`${KRATOS_ADMIN_URL}/identities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error("Failed to create Kratos identity")
  }

  return await res.json()
}
