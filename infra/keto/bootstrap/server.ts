import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://keto:4467";

/**
 * POST /bootstrap/tenants
 */
app.post("/bootstrap/tenants", async (req, res) => {
  const { userId, tenants, role } = req.body;

  if (!userId || !Array.isArray(tenants) || tenants.length === 0) {
    return res.status(400).json({
      error: "userId and tenants[] are required",
    });
  }

  const relation = role || "platform.user";

  try {
    for (const tenantId of tenants) {
      await axios.put(`${KETO_ADMIN_URL}/admin/relation-tuples`, {
        namespace: "tenant",
        object: tenantId,
        relation,
        subject_id: userId,
      });
    }

    return res.status(201).json({
      message: "Tenant access granted",
      userId,
      tenants,
      relation,
    });

  } catch (err: any) {
    console.error(
      "Keto error:",
      err?.response?.data || err?.message || err
    );

    return res.status(500).json({
      error: "Failed to create tenant relations",
    });
  }
});

app.listen(4000, () => {
  console.log("Keto bootstrap service running on port 4000");
});
