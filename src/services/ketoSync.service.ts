import axios from "axios";

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://localhost:4466";

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://localhost:4466";

// =====================================================
// CREATE RELATION TUPLE — MATCHES YOUR CURL TEST
// =====================================================
export async function createRelationTuple(payload: {
  namespace: string;
  object: string;
  relation: string;
  subject_id: string;
}) {
  try {
    await axios.put(
      `${KETO_ADMIN_URL}/admin/relation-tuples`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("➕ Keto tuple created:", payload);

  } catch (err: any) {
    if (err.response?.status === 409) {
      console.log("⚠️ Tuple already exists — skip");
      return;
    }

    console.error("❌ Keto create failed:", err.response?.data);
    throw err;
  }
}

// =====================================================
// LIST TUPLES (namespace REQUIRED)
// =====================================================
async function listTuplesForSubject(subject_id: string) {
  const res = await axios.get(
    `${KETO_READ_URL}/relation-tuples`,
    {
      params: {
        namespace: "tenant",
        subject_id,
      },
    }
  );

  return res.data.relation_tuples || [];
}

// =====================================================
// DELETE TUPLES
// =====================================================
export async function deleteRelationsForSubject(subject_id: string) {
  const tuples = await listTuplesForSubject(subject_id);

  for (const t of tuples) {
    await axios.delete(
      `${KETO_ADMIN_URL}/admin/relation-tuples`,
      {
        params: {
          namespace: t.namespace,
          object: t.object,
          relation: t.relation,
          subject_id: t.subject_id,
        },
      }
    );

    console.log("🗑️ Deleted tuple:", t);
  }
}

// =====================================================
// SYNC ROLES
// =====================================================
export async function syncKetoRoles(
  identityId: string,
  tenantIds: string[],
  roles: string[]
) {
  await deleteRelationsForSubject(identityId);

  for (const tenantId of tenantIds) {
    for (const role of roles) {
      await createRelationTuple({
        namespace: "tenant",
        object: tenantId,
        relation: role,
        subject_id: identityId,
      });
    }
  }

  console.log("✅ Keto roles synced");
}
