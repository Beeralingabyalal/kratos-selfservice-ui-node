import { Router } from "express";
import { requireJwt } from "../lib/requireJwt";
import { listKratosIdentities } from "../services/kratosClient";

const router = Router();

/**
 * GET /api/admin/identities
 */
router.get(
  "/api/admin/identities",
  requireJwt,
  async (req, res) => {
    try {
      const identities = await listKratosIdentities();

      res.json({
        count: identities.length,
        identities,
      });

    } catch (err: any) {
      console.error("List identities failed:", err.message);

      res.status(500).json({
        error: "Failed to list identities",
        details: err.message,
      });
    }
  }
);

export default router;
