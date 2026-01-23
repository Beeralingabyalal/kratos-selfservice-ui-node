const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ msg: "JWT required" });
  }

  const token = header.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userTenants = decoded.tenants || [];
    const roles = decoded.roles || [];

    let requestedTenants = req.query.tenant;

    if (!requestedTenants) {
      return res.status(400).json({ msg: "tenant query param required" });
    }

    // ✅ support single & multiple tenants
    if (!Array.isArray(requestedTenants)) {
      requestedTenants = [requestedTenants];
    }

    const unauthorized = requestedTenants.filter(
      t => !userTenants.includes(t)
    );

    if (unauthorized.length > 0) {
      return res.status(403).json({
        msg: "Access denied for tenant(s)",
        unauthorized
      });
    }

    req.userId = decoded.userId;
    req.tenants = requestedTenants;
    req.roles = roles;

    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(401).json({ msg: "Invalid JWT" });
  }
};
