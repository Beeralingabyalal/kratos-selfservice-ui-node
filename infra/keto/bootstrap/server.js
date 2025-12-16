import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://keto:4467";

/**
 * POST /bootstrap/tenant
 *
 * Body:
 * {
 *   "tenantId": "tenant-123",
 *   "userId": "kratos-user-id"
 * }
 */
app.post("/bootstrap/tenant", async (req, res) => {
  const { tenantId, userId } = req.body;

  if (!tenantId || !userId) {
    return res.status(400).json({
      error: "tenantId and userId are required"
    });
  }

  try {
    await axios.put(
      `${KETO_ADMIN_URL}/admin/relation-tuples`,
      {
        namespace: "tenant",
        object: tenantId,
        relation: "access",
        subject: {
          namespace: "identity",
          object: userId
        }
      }
    );

    return res.status(201).json({
      message: "Tenant access granted in Keto",
      tenantId,
      userId
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to create relation tuple in Keto"
    });
  }
});

app.listen(4000, () => {
  console.log("Keto bootstrap service running on port 4000");
});
