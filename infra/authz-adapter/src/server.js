const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://keto:4466";

app.post("/authorize", async (req, res) => {
  const userId = req.header("x-user-id");
  const tenantId = req.header("x-tenant-id");

  // Hard guard
  if (!userId || !tenantId) {
    return res.status(403).json({ allowed: false });
  }

  try {
    const { data } = await axios.post(
      `${KETO_READ_URL}/relation-tuples/check`,
      {
        namespace: "tenant",
        object: tenantId,
        relation: "access",
        subject_id: userId   // :white_check_mark: THIS IS THE FIX
      }
    );

    return res.status(data.allowed ? 200 : 403).json({
      allowed: data.allowed
    });

  } catch (err) {
    console.error("AuthZ Adapter error:", err.response?.data || err.message);
    return res.status(403).json({ allowed: false });
  }
});

app.listen(7000, "0.0.0.0", () => {
  console.log("AuthZ Adapter running on port 7000");
});