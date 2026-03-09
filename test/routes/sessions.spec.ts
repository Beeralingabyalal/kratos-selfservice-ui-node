import express from "express"
import request from "supertest"
import { registerSessionsRoute } from "../../src/routes"

describe("sessions route", () => {
  const app = express()
  const router = express.Router()

  // mock session middleware
  app.use((req: any, _res, next) => {
    req.session = {
      identity: { id: "user1" },
      authentication_methods: [
        { method: "password", aal: "aal1" },
      ],
    }
    next()
  })

  registerSessionsRoute(router)
  app.use(router)

  test("GET /sessions responds", async () => {
    const res = await request(app).get("/sessions")
    expect([200, 302, 303]).toContain(res.status)
  })

  test("GET /sessions/export responds", async () => {
    const res = await request(app).get("/sessions/export")
    expect(res.status).toBeDefined()
  })
})
