import request from "supertest"
import express from "express"
import server from "../../infra/authz-adapter/src/server"

describe("POST /check", () => {

  test("403 when no certificate", async () => {
    const res = await request(server)
      .post("/check")
      .send({
        namespace: "tenant",
        object: "t1",
        relation: "admin"
      })

    expect(res.status).toBe(403)
  })

})