import fs from "fs";
import path from "path";
import requireAdmin from "../../../src/lib/requireAdmin.audit";

async function handler(req, res) {
  const logFile = path.join(process.cwd(), "infra", "audit", "admin-actions.log");

  try {
    const logs = fs.readFileSync(logFile, "utf8");
    res.status(200).json({ logs });
  } catch (err) {
    res.status(200).json({ logs: "No logs found yet." });
  }
}

export default requireAdmin(handler);
