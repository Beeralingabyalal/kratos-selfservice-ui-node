import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://keto:4467";

/**
 * POST /bootstrap/tenants
 * Body:
 * {
 *   "userId": "kratos-user-id",
 *   "tenants": ["t1013", "t1014", "t1015"]
 * }
 */
app.post("/bootstrap/tenants", async (req, res) => {
  const { userId, tenants } = req.body;

  if (!userId || !Array.isArray(tenants) || tenants.length === 0) {
    return res.status(400).json({
      error: "userId and tenants[] are required"
    });
  }

  try {
    for (const tenantId of tenants) {
      await axios.put(`${KETO_ADMIN_URL}/admin/relation-tuples`, {
        namespace: "tenant",
        object: tenantId,
        relation: "access",
        subject_id: userId
      });
    }

    console.log(":white_check_mark: Multiple tenants created", { userId, tenants });

    return res.status(201).json({
      message: "Tenants access granted",
      userId,
      tenants
    });
  } catch (err) {
    console.error("Keto error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to create tenant relations"
    });
  }
});

app.listen(4000, () => {
  console.log("Keto bootstrap service running on port 4000");
});