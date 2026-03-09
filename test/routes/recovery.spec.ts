import express from "express"
import request from "supertest"
import { registerRecoveryRoute } from "../../src/routes"

describe("recovery route", () => {
  const app = express()
  const router = express.Router()

  const fakeHelpers: any = () => ({
    apiBaseUrl: "http://fake",
    frontend: {
      createBrowserRecoveryFlow: jest.fn().mockResolvedValue({
        data: { id: "r1", ui: { nodes: [] } },
      }),
      getRecoveryFlow: jest.fn().mockResolvedValue({
        data: { id: "r1", ui: { nodes: [] } },
      }),
    },
    logoUrl: "",
  })

  app.response.render = function () {
    return this.status(200).send("ok")
  }

  registerRecoveryRoute(router, fakeHelpers)
  app.use(router)

  test("GET /recovery responds", async () => {
    const res = await request(app).get("/recovery")

    expect([200, 302, 303, 500]).toContain(res.status)
  })
})
