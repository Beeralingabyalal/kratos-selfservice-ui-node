import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://keto:4467";

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://keto:4466";

// ===============================
// CHECK EXISTENCE
// ===============================
async function tupleExists(payload: any) {
  const res = await axios.get(`${KETO_READ_URL}/relation-tuples`, {
    params: payload,
  });

  return res.data.relation_tuples?.length > 0;
}

// ===============================
// FIXED ROUTE (tenant)
// ===============================
app.post("/bootstrap/tenant", async (req, res) => {
  const { userId, tenantId, role } = req.body;

  if (!userId || !tenantId) {
    return res.status(400).json({
      error: "userId and tenantId required",
    });
  }

  const relation = role || "platform.user";

  try {
    const payload = {
      namespace: "tenant",
      object: tenantId,
      relation,
      subject_id: userId,
    };

    const exists = await tupleExists(payload);

    if (exists) {
      return res.status(200).json({
        status: "exists",
        message: "Relation already exists",
      });
    }

    await axios.put(`${KETO_ADMIN_URL}/admin/relation-tuples`, payload);

    return res.status(201).json({
      status: "created",
      message: "Tenant access granted",
    });

  } catch (err: any) {
    console.error("Keto error:", err?.response?.data || err?.message);

    return res.status(500).json({
      error: "Failed to create tenant relation",
    });
  }
});

app.listen(4000, () => {
  console.log("Keto bootstrap service running on port 4000");
});