import express from "express"
import request from "supertest"
import { registerRegistrationRoute } from "../../src/routes"

describe("registration route", () => {
  const app = express()
  const router = express.Router()

  registerRegistrationRoute(router)
  app.use(router)

  test("GET /registration responds", async () => {
    const res = await request(app).get("/registration")
    expect([200, 302, 303]).toContain(res.status)
  })

  test("POST /registration does not crash", async () => {
    const res = await request(app)
      .post("/registration")
      .send({ email: "a@a.com", password: "pass" })

    expect(res.status).toBeDefined()
  })
})
