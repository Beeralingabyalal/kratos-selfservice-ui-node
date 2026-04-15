import axios from "axios";

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://localhost:4467";

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://localhost:4466";

// ===============================
// CHECK EXISTENCE
// ===============================
async function tupleExists(payload: {
  namespace: string;
  object: string;
  relation: string;
  subject_id: string;
}) {
  const res = await axios.get(`${KETO_READ_URL}/relation-tuples`, {
    params: payload,
  });

  return res.data.relation_tuples?.length > 0;
}

// ===============================
// CREATE (SAFE)
// ===============================
export async function createRelationTuple(payload: {
  namespace: string;
  object: string;
  relation: string;
  subject_id: string;
}) {
  const exists = await tupleExists(payload);

  if (exists) {
    console.log("⚠️ Tuple already exists — skip");
    return "exists";
  }

  await axios.put(
    `${KETO_ADMIN_URL}/admin/relation-tuples`,
    payload,
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  console.log("➕ Keto tuple created:", payload);
  return "created";
}

// ===============================
// LIST TUPLES
// ===============================
async function listTuplesForSubject(subject_id: string) {
  const res = await axios.get(`${KETO_READ_URL}/relation-tuples`, {
    params: {
      namespace: "tenant",
      subject_id,
    },
  });

  return res.data.relation_tuples || [];
}

// ===============================
// DELETE ALL
// ===============================
export async function deleteRelationsForSubject(subject_id: string) {
  const tuples = await listTuplesForSubject(subject_id);

  for (const t of tuples) {
    await axios.delete(`${KETO_ADMIN_URL}/admin/relation-tuples`, {
      params: {
        namespace: t.namespace,
        object: t.object,
        relation: t.relation,
        subject_id: t.subject_id,
      },
    });

    console.log("🗑️ Deleted tuple:", t);
  }
}

// ===============================
// SYNC ROLES (SAFE)
// ===============================
export async function syncKetoRoles(
  identityId: string,
  tenantIds: string[],
  roles: string[]
) {
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