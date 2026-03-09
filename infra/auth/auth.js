const jwt = require("jsonwebtoken");
const axios = require("axios");

const KETO_READ_URL = process.env.KETO_READ_URL || "http://keto:4466";

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ msg: "JWT required" });
  }

  const token = header.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const roles = decoded.roles || [];

    let requestedTenants = req.query.tenant;
    if (!requestedTenants) {
      return res.status(400).json({ msg: "tenant query param required" });
    }

    if (!Array.isArray(requestedTenants)) {
      requestedTenants = [requestedTenants];
    }

    // 🔥 LIVE CHECK WITH KETO
    for (const tenant of requestedTenants) {
      const { data } = await axios.get(
        `${KETO_READ_URL}/relation-tuples/check`,
        {
          params: {
            namespace: "tenant",
            object: tenant,
            relation: "access",
            subject_id: userId
          }
        }
      );

      if (!data.allowed) {
        return res.status(403).json({
          msg: "Access denied for tenant",
          tenant
        });
      }
    }

    req.userId = userId;
    req.tenants = requestedTenants;
    req.roles = roles;

    next();

  } catch (err) {
    console.error("AUTH ERROR:", err.response?.data || err.message);
    res.status(401).json({ msg: "Authorization service error" });
  }
};
