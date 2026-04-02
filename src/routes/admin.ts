import { RouteRegistrator } from "../pkg";
import { requireJwt } from "../lib/requireJwt";
import { requireAdminJwt } from "../lib/requireAdminJwt";
import { createMultipleTenants } from "../services/tenantService";
import { getAllTenants } from "../services/tenantService";
import express from "express";

export const registerAdminRoutes: RouteRegistrator = (router) => {
  router.post(
    "/api/admin/tenants/bulk",
    express.json(),
    requireJwt,
    requireAdminJwt,
    async (req: any, res) => {
      try {
        const { tenantNames } = req.body;

        if (!Array.isArray(tenantNames) || tenantNames.length === 0) {
          return res.status(400).json({
            error: "tenantNames array is required",
          });
        }

        const identityId = req.jwt.sub;

        const tenants = await createMultipleTenants(
          tenantNames,
          identityId
        );

        res.json({
          message: "Tenant onboarding completed",
          count: tenants.length,
          tenants,
        });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({
          error: "Tenant onboarding failed",
        });
      }
    }
  );

  router.get(
  "/api/admin/tenants",
  requireJwt,
  requireAdminJwt,
  async (req: any, res) => {
    try {
      const tenants = await getAllTenants();

      res.json({
        count: tenants.length,
        tenants,
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({
        error: "Failed to fetch tenants",
      });
    }
  }
);
};
