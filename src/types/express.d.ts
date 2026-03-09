import type { Session } from "@ory/client";

declare global {
  namespace Express {
    interface Request {
      session?: Session;
      jwt?: {
        sub: string;
        email?: string;
        role?: string;
        tenants?: any[];
      };
      actor?: any;
    }
  }
}

export {};
