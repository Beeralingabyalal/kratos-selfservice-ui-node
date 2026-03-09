import fetch from "node-fetch";

const KRATOS_ADMIN_URL =
  process.env.KRATOS_ADMIN_URL || "http://localhost:4434";

export type KratosTraits = {
  email: string;
  tenant_id: string[];
  roles: string[];
};

export type KratosIdentity = {
  id: string;
  traits: KratosTraits;
};

type KratosCreateResponse = {
  id: string;
  traits: KratosTraits;
};

type KratosUpdateResponse = {
  id: string;
  traits: KratosTraits;
};

const SCHEMA_ID = "scansure_v1";


// =====================================================
// ✅ CREATE IDENTITY (IDEMPOTENT)
// =====================================================

export async function createKratosIdentity({
  email,
  tenantId,
  roles,
  password,
}: {
  email: string;
  tenantId: string;
  roles: string[];
  password: string
}): Promise<KratosIdentity> {

  // 🔎 Check if identity already exists by email
  const existing = await listKratosIdentities(email);

  if (existing.length > 0) {
    console.log("⚠️ Identity already exists:", existing[0].id);
    return existing[0];
  }

  const payload = {
    schema_id: SCHEMA_ID,
    traits: {
      email,
      tenant_id: [tenantId],
      roles,
    },
    credentials: {
      password: {
        config: {
          password,
        },
      },
    },
  };

  const res = await fetch(`${KRATOS_ADMIN_URL}/admin/identities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("❌ Kratos CREATE status:", res.status);
    console.error("❌ Kratos CREATE response:", text);
    throw new Error(text);
  }

  const data = JSON.parse(text) as KratosCreateResponse;

  console.log("✅ Kratos identity created:", data.id);

  return data;
}


// =====================================================
// ✅ UPDATE IDENTITY
// =====================================================

export async function updateKratosIdentity(
  identityId: string,
  {
    email,
    tenantIds,
    roles,
    newPassword,
  }: {
    email: string;
    tenantIds: string[];
    roles: string[];
    newPassword?: string;
  }
): Promise<KratosIdentity> {

  const payload: any = {
    schema_id: SCHEMA_ID,
    traits: {
      email,
      tenant_id: tenantIds,
      roles,
    },
  };

  if (newPassword) {
    payload.credentials = {
      password: {
        config: { password: newPassword },
      },
    };
  }

  const res = await fetch(
    `${KRATOS_ADMIN_URL}/admin/identities/${identityId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const text = await res.text();

  if (!res.ok) {

    if (res.status === 409) {
      console.warn("⚠️ Kratos conflict — returning current identity");
      return getKratosIdentity(identityId);
    }

    console.error("❌ Kratos UPDATE status:", res.status);
    console.error("❌ Kratos UPDATE response:", text);
    throw new Error(text);
  }

  const data = JSON.parse(text) as KratosUpdateResponse;

  console.log("✅ Kratos identity updated:", data.id);

  return data;
}


// =====================================================
// ✅ LIST IDENTITIES (OPTIONAL EMAIL FILTER)
// =====================================================

export async function listKratosIdentities(
  email?: string
): Promise<KratosIdentity[]> {

  const res = await fetch(`${KRATOS_ADMIN_URL}/admin/identities`);

  const text = await res.text();

  if (!res.ok) {
    console.error("❌ Kratos LIST status:", res.status);
    console.error("❌ Kratos LIST response:", text);
    throw new Error(text);
  }

  const data = JSON.parse(text);

  const identities: KratosIdentity[] = Array.isArray(data)
    ? data
    : data.identities || [];

  // 🔎 If email provided → filter locally
  if (email) {
    return identities.filter(
      (i) => i.traits?.email?.toLowerCase() === email.toLowerCase()
    );
  }

  return identities;
}


// =====================================================
// ✅ GET SINGLE IDENTITY
// =====================================================

export async function getKratosIdentity(
  identityId: string
): Promise<KratosIdentity> {

  const res = await fetch(
    `${KRATOS_ADMIN_URL}/admin/identities/${identityId}`
  );

  const text = await res.text();

  if (!res.ok) {
    console.error("❌ Kratos GET status:", res.status);
    console.error("❌ Kratos GET response:", text);
    throw new Error(text);
  }

  return JSON.parse(text);
}


// =====================================================
// ✅ DELETE IDENTITY
// =====================================================

// =====================================================
// ✅ DELETE IDENTITY
// =====================================================

export async function deleteKratosIdentity(
  identityId: string
): Promise<"deleted" | "already_deleted"> {

  const res = await fetch(
    `${KRATOS_ADMIN_URL}/admin/identities/${identityId}`,
    { method: "DELETE" }
  );

  // ✅ 2xx (204 included)
  if (res.ok) {
    console.log("✅ Identity deleted:", identityId);
    return "deleted";
  }

  // ✅ 404 → already deleted
  if (res.status === 404) {
    console.warn("⚠️ Identity already deleted:", identityId);
    return "already_deleted";
  }

  // ❌ Real error
  const text = await res.text();
  console.error("❌ Kratos DELETE status:", res.status);
  console.error("❌ Kratos DELETE response:", text);
  throw new Error(text);
}
