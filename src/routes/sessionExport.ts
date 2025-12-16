import { Request, Response } from "express";
import { RouteRegistrator } from "../pkg";

export const registerSessionExportRoute: RouteRegistrator = (app) => {
  app.get("/api/session/export", (req: Request, res: Response) => {
    const sessionCookie = req.cookies["ory_kratos_session"];

    if (!sessionCookie) {
      return res.status(401).json({
        error: "No session cookie found. Please log in first."
      });
    }

    return res.json({
      session_cookie: sessionCookie
    });
  });
};
