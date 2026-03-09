import request from "supertest"
import express from "express"

jest.mock("../../src/lib/requireJwt", () => ({
  requireJwt: (req: any, _res: any, next: any) => {
    req.jwt = {
      sub: "user1",
      role: "platform.admin",
    }
    next()
  },
}))

jest.mock("../../src/services/permission.service", () => ({
  checkTenantAccess: jest.fn(),
}))

import { checkTenantAccess } from "../../src/services/permission.service"
import protectedRouter from "../../src/routes/protected"

const app = express()
app.use(express.json())
app.use(protectedRouter)

describe("GET /api/protected", () => {
  test("returns 200 when allowed", async () => {
    ;(checkTenantAccess as jest.Mock).mockResolvedValue(true)

    const res = await request(app)
      .get("/api/protected?tenant=t1")

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/granted/)
  })

  test("returns 403 when denied", async () => {
    ;(checkTenantAccess as jest.Mock).mockResolvedValue(false)

    const res = await request(app)
      .get("/api/protected?tenant=t1")

    expect(res.status).toBe(403)
  })
})
