import type { Session } from "@ory/client";

declare global {
  namespace Express {
    interface Request {
      session?: Session;
      jwt?: {
        sub: string;
        email?: string;
        role?: string;
        roles?: string[];
        scope?: string;
        tenant_id?: string | string[];
        tenant_ids?: string[];
        tenants?: any[];
      };
      actor?: any;
    }
  }
}

export {};
