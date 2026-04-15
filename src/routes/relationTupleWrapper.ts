import { Router } from "express";
import axios from "axios";

const router = Router();

const KETO_ADMIN_URL = process.env.KETO_ADMIN_URL || "http://localhost:4467";
const KETO_READ_URL = process.env.KETO_READ_URL || "http://localhost:4466";

type RelationTuple = {
  namespace: string;
  object: string;
  relation: string;
  subject_id: string;
};

function isSameTuple(a: Partial<RelationTuple>, b: RelationTuple) {
  return (
    a.namespace === b.namespace &&
    a.object === b.object &&
    a.relation === b.relation &&
    a.subject_id === b.subject_id
  );
}

async function relationTupleExists(payload: RelationTuple): Promise<boolean> {
  const res = await axios.get(`${KETO_READ_URL}/relation-tuples`, {
    params: payload,
  });

  const tuples: Partial<RelationTuple>[] = res.data.relation_tuples || [];
  return tuples.some((tuple) => isSameTuple(tuple, payload));
}

router.post("/api/relation-tuples/create", async (req, res) => {
  try {
    const { namespace, object, relation, subject_id } = req.body;

    if (!namespace || !object || !relation || !subject_id) {
      return res.status(400).json({
        error: "namespace, object, relation, subject_id are required",
      });
    }

    const payload: RelationTuple = {
      namespace,
      object,
      relation,
      subject_id,
    };

    const exists = await relationTupleExists(payload);

    if (exists) {
      return res.status(200).json({
        status: "exists",
        tuple: payload,
      });
    }

    await axios.put(`${KETO_ADMIN_URL}/admin/relation-tuples`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    return res.status(201).json({
      status: "created",
      tuple: payload,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.response?.data || err.message || "Failed to create tuple",
    });
  }
});

export default router;
