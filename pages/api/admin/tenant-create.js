import requireAdmin from "../../../src/lib/requireAdmin.audit";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { tenantName } = req.body;

  // Placeholder — no backend required
  return res.json({
    ok: true,
    tenantName,
    tenantId: "tenant-" + Date.now(),
    message: "Tenant onboarding API placeholder (no backend yet)"
  });
}

export default requireAdmin(handler);
