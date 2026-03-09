import express from "express";
import request from "supertest";
import router from "../../src/routes/tenantResource";

/* mock middlewares so route can run */
jest.mock("../../src/lib/requireJwt", () => ({
  requireJwt: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../src/lib/requireTenantAccess", () => ({
  requireTenantAccess: () => (_req: any, _res: any, next: any) => next(),
}));

describe("tenantResource routes", () => {

  const app = express();
  app.use(express.json());
  app.use(router);

  test("GET resource should return 200", async () => {
    const res = await request(app)
      .get("/api/tenant/t100/resource");

    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe("t100");
  });

  test("POST admin-action should return 200", async () => {
    const res = await request(app)
      .post("/api/tenant/t100/admin-action");

    expect(res.status).toBe(200);
  });

});
