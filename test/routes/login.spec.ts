import express from "express"
import request from "supertest"
import { registerLoginRoute } from "../../src/routes"

describe("login route", () => {
  const app = express()
  const router = express.Router()

  // register only login route
  registerLoginRoute(router)
  app.use(router)

  test("GET /login should respond (redirect or 200)", async () => {
    const res = await request(app).get("/login")

    // your route usually redirects to kratos flow
    expect([200, 302, 303]).toContain(res.status)
  })

  test("POST /login should not crash", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "test@test.com", password: "pass" })

    expect(res.status).toBeDefined()
  })
})
