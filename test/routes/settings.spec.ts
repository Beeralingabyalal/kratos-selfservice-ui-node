import express from "express"
import request from "supertest"
import { registerSettingsRoute } from "../../src/routes"

describe("settings route", () => {
  const app = express()
  const router = express.Router()

  const fakeHelpers: any = () => ({
    apiBaseUrl: "http://fake-base",
    kratosBrowserUrl: "http://kratos-browser",   // ✅ REQUIRED FIX
    logoUrl: "",

    frontend: {
      toSession: jest.fn().mockResolvedValue({ data: {} }),

      getSettingsFlow: jest.fn().mockResolvedValue({
        data: {
          id: "flow1",
          ui: { nodes: [] },
          return_to: "",
        },
      }),

      createBrowserLogoutFlow: jest.fn().mockResolvedValue({
        data: { logout_url: "/logout" },
      }),
    },
  })

  // prevent template rendering crash
  app.response.render = function () {
    return this.status(200).send("ok")
  }

  registerSettingsRoute(router, fakeHelpers)
  app.use(router)

  test("GET /settings responds", async () => {
    const res = await request(app).get("/settings?flow=flow1")
    expect([200, 302, 303]).toContain(res.status)
  })
})
