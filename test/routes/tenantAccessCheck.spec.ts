import express from "express";
import request from "supertest";
import router from "../../src/routes/tenantAccessCheck";
import * as svc from "../../src/services/tenantAccess.service";

/* mock service */
jest.mock("../../src/services/tenantAccess.service");

/* mock jwt middleware */
jest.mock("../../src/lib/requireJwt", () => ({
  requireJwt: (req: any, _res: any, next: any) => {
    req.jwt = { sub: "u1" };
    next();
  },
}));

describe("tenantAccessCheck route", () => {

  const app = express();
  app.use(express.json());
  app.use(router);

  test("400 if body missing", async () => {
    const res = await request(app)
      .post("/api/tenant/access/check")
      .send({});

    expect(res.status).toBe(400);
  });

  test("allowed = true", async () => {
    (svc.checkTenantAccess as jest.Mock)
      .mockResolvedValue(true);

    const res = await request(app)
      .post("/api/tenant/access/check")
      .send({
        tenantId: "t1",
        action: "read"
      });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
  });

  test("allowed = false", async () => {
    (svc.checkTenantAccess as jest.Mock)
      .mockResolvedValue(false);

    const res = await request(app)
      .post("/api/tenant/access/check")
      .send({
        tenantId: "t1",
        action: "write"
      });

    expect(res.body.allowed).toBe(false);
  });

});
