const requireAdmin = require("../../lib/requireAdmin.audit");

module.exports = requireAdmin(async (req, res) => {
  res.json({ msg: "Admin access allowed!" });
});
