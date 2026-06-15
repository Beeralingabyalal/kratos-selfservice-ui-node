import { Request, Response } from "express";
import { RouteRegistrator } from "../pkg";

export const registerSessionExportRoute: RouteRegistrator = (app) => {
  app.post("/api/session/jwt", async (req: Request, res: Response) => {
    const hydraPublicUrl =
      process.env.HYDRA_PUBLIC_URL || process.env.HYDRA_ISSUER_URL;

    return res.status(410).json({
      error: "Custom JWT minting is disabled. Use Ory Hydra OAuth2/OIDC instead.",
      issuer: hydraPublicUrl || null,
      authorization_endpoint: hydraPublicUrl
        ? `${hydraPublicUrl.replace(/\/$/, "")}/oauth2/auth`
        : null,
      token_endpoint: hydraPublicUrl
        ? `${hydraPublicUrl.replace(/\/$/, "")}/oauth2/token`
        : null,
    });
  });
};
