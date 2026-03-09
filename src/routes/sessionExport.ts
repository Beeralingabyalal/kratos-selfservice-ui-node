import { Request, Response } from "express";
import { RouteRegistrator } from "../pkg";
import fetch from "node-fetch";
import { createJwt } from "../services/jwt.service";
import { getUserTenants } from "../services/tenantAccess.service";

export const registerSessionExportRoute: RouteRegistrator = (app) => {
  app.post("/api/session/jwt", async (req: Request, res: Response) => {
    try {
      const sessionCookie = req.cookies["ory_kratos_session"];
      const sessionToken = req.headers["x-session-token"] as string | undefined;

      if (!sessionCookie && !sessionToken) {
        return res.status(401).json({
          error: "No Kratos session found. Please login first.",
        });
      }

      // 🔍 Call Kratos whoami
      const whoamiRes = await fetch(
        `${process.env.KRATOS_PUBLIC_URL}/sessions/whoami`,
        {
          headers: sessionToken
            ? { "X-Session-Token": sessionToken }
            : { Cookie: `ory_kratos_session=${sessionCookie}` },
        }
      );

      if (!whoamiRes.ok) {
        return res.status(401).json({ error: "Invalid Kratos session" });
      }

      const whoami: any = await whoamiRes.json();

      const identityId = whoami.identity.id;
      const email = whoami.identity.traits.email;
      const roles = whoami.identity.traits.roles || [];

      // 🔐 Only admins can get admin JWT
      if (!roles.includes("platform.admin")) {
        return res.status(403).json({
          error: "Only admin can obtain admin JWT",
        });
      }

      // 📦 Fetch tenant permissions from DB
      const tenants = await getUserTenants(identityId);

      // 🔑 CREATE JWT (THIS IS THE KEY PART)
      const token = createJwt({
        sub: identityId,
        email,
        role: "platform.admin",
        tenants,
      });

      return res.json({
        access_token: token,
        expires_in: process.env.JWT_EXPIRES || "1h",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to create JWT" });
    }
  });
};
