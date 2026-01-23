require("dotenv").config();
const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const auth = require("./auth");

const app = express();
app.use(express.json());

const KRATOS_PUBLIC_URL = process.env.KRATOS_PUBLIC_URL;

/**
 * STEP 1: Exchange SESSION TOKEN → JWT
 */
app.get("/jwt", async (req, res) => {
  const sessionToken = req.headers["x-session-token"];

  if (!sessionToken) {
    return res.status(401).json({ msg: "Session token required" });
  }

  try {
    const { data } = await axios.get(
      `${KRATOS_PUBLIC_URL}/sessions/whoami`,
      {
        headers: {
          "X-Session-Token": sessionToken
        }
      }
    );

    const userId = data.identity.id;
    const tenants = data.identity.traits.tenant_id; // ARRAY ✅
    const roles = data.identity.traits.roles || [];

    console.log("JWT_SECRET USED TO SIGN:", process.env.JWT_SECRET);

    const token = jwt.sign(
      { userId, tenants, roles },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(401).json({ msg: "Invalid session token" });
  }
});

/**
 * STEP 2: Protected API
 */
app.get("/api/data", auth, (req, res) => {
  res.json({
    msg: "Access granted",
    user: req.userId,
    tenants: req.tenants,
    roles: req.roles
  });
});

app.listen(process.env.PORT, () => {
  console.log(`✅ Auth service running on port ${process.env.PORT}`);
});
