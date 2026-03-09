import axios from "axios";

const KETO_ADMIN_URL = process.env.KETO_ADMIN_URL || "http://localhost:4467";

export async function createRelationTuple(payload: {
  namespace: string;
  object: string;
  relation: string;
  subject_id: string;
}) {
  await axios.put(
    `${KETO_ADMIN_URL}/admin/relation-tuples`,
    payload,
    { headers: { "Content-Type": "application/json" } }
  );
}

export async function deleteRelationsForSubject(subject_id: string) {
  await axios.delete(
    `${KETO_ADMIN_URL}/admin/relation-tuples`,
    { params: { subject_id } }
  );
}
