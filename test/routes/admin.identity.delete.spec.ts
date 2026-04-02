import request from "supertest"
import express from "express"
import router from "../../src/routes/admin.identity.delete"

jest.mock("../../src/lib/requireJwt", () => ({
  requireJwt: (req:any,res:any,next:any)=>{
    req.jwt={sub:"admin1",role:"platform.admin"}
    next()
  }
}))

jest.mock("../../src/services/kratosClient", () => ({
  deleteKratosIdentity: jest.fn().mockResolvedValue("deleted")
}))

jest.mock("../../src/services/ketoSync.service", () => ({
  deleteRelationsForSubject: jest.fn().mockResolvedValue(true)
}))

const app = express()
app.use(express.json())
app.use(router)

describe("DELETE /api/admin/identities/:id", () => {

  test("deletes identity", async () => {

    const res = await request(app)
      .delete("/api/admin/identities/id123")

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})