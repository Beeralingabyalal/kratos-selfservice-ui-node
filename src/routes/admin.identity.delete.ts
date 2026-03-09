import { Router } from "express";
import { requireJwt } from "../lib/requireJwt";
import { deleteKratosIdentity } from "../services/kratosClient";
import { deleteRelationsForSubject } from "../services/ketoSync.service";

const router = Router();

/**
 * DELETE /api/admin/identities/:id
 */
router.delete(
  "/api/admin/identities/:id",
  requireJwt,
  async (req, res) => {
    try {
      const { id } = req.params;

      // 1️⃣ Delete from Kratos
      const result = await deleteKratosIdentity(id);

      if (result === "deleted" || result === "already_deleted") {

        // 2️⃣ ALWAYS cleanup Keto
        await deleteRelationsForSubject(id);

        return res.json({
          success: true,
          message: "Identity and all permissions deleted successfully",
          id,
        });
      }

    } catch (err: any) {
      console.error("Delete identity failed:", err.message);

      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

export default router;