import "express-session";
import { Session as KratosSession } from "@ory/client";

declare module "express-session" {
  interface SessionData {
    identity?: KratosSession["identity"];
  }
}
