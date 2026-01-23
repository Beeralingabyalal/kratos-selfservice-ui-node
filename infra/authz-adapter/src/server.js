const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://keto:4466";

/**
 * Envoy calls:
 * /authorize/api/anything
 */
app.all("/authorize/*", async (req, res) => {

  // 🔑 User from JWT (forwarded by Envoy)
  const user = req.header("x-user-id");

  // 🏢 Tenant from query param
  const tenant = req.query.tenant;

  if (!user || !tenant) {
    return res.sendStatus(403);
  }

  try {
    const { data } = await axios.post(
      `${KETO_READ_URL}/relation-tuples/check`,
      {
        namespace: "tenant",
        object: tenant,
        relation: "member",
        subject_id: user
      }
    );

    return res.sendStatus(data.allowed ? 200 : 403);

  } catch (err) {
    console.error("AuthZ error:", err.response?.data || err.message);
    return res.sendStatus(403);
  }
});

app.listen(7000, "0.0.0.0", () => {
  console.log("AuthZ Adapter running on port 7000");
});
