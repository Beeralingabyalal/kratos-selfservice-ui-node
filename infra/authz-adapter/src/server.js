const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://keto:4466";

app.post("/authorize", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const tenantId = req.headers["x-tenant-id"];

    if (!userId || !tenantId) {
      return res.status(401).json({
        allowed: false,
        reason: "Missing user or tenant"
      });
    }

    // Ask Keto
    await axios.post(`${KETO_READ_URL}/check`, {
      namespace: "tenant",
      object: tenantId,
      relation: "access",
      subject: {
        namespace: "identity",
        object: userId
      }
    });

    return res.json({ allowed: true });
  } catch (err) {
    return res.status(403).json({ allowed: false });
  }
});

app.listen(7000, "0.0.0.0", () => {
  console.log("AuthZ Adapter running on port 7000");
});
