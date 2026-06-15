import request from "supertest"
import express from "express"
import cookieParser from "cookie-parser"
import { registerSessionExportRoute } from "../../src/routes/sessionExport"

const app = express()
app.use(cookieParser())

registerSessionExportRoute(app)

describe("POST /api/session/jwt", () => {

  test("410 because custom JWT minting is disabled", async () => {
    const res = await request(app)
      .post("/api/session/jwt")

    expect(res.status).toBe(410)
    expect(res.body.error).toMatch(/Custom JWT minting is disabled/)
  })

})
