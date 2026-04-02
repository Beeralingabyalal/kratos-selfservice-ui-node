import request from "supertest"
import express from "express"
import router from "../../src/routes/admin.identity"

jest.mock("../../src/lib/requireJwt", () => ({
  requireJwt: (req: any, res: any, next: any) => {
    req.jwt = { sub: "admin1", role: "platform.admin" }
    next()
  },
}))

jest.mock("../../src/services/kratosClient", () => ({
  createKratosIdentity: jest.fn().mockResolvedValue({
    id: "identity1",
    traits: { email: "test@test.com" },
  }),
  updateKratosIdentity: jest.fn().mockResolvedValue({
    id: "identity1",
  }),
}))

jest.mock("../../src/services/ketoSync.service", () => ({
  syncKetoRoles: jest.fn().mockResolvedValue(true),
}))

jest.mock("../../src/lib/db", () => ({
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({
        rows: [{ id: "tenant1" }],
        rowCount: 1,
      }),
      release: jest.fn(),
    }),
  },
}))

const app = express()
app.use(express.json())
app.use(router)

describe("POST /api/admin/identities", () => {
  test("creates identity", async () => {
    const res = await request(app)
      .post("/api/admin/identities")
      .send({
        email: "test@test.com",
        tenantId: "tenantA",
        roles: ["platform.admin"],
        password: "pass123",
      })

    expect(res.status).toBe(200)
    expect(res.body.identity.id).toBe("identity1")
  })
})