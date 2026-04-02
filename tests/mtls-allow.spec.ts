import axios from "axios"
import https from "https"
import fs from "fs"
import path from "path"

const BASE_URL = "https://172.30.176.1:8443"

const cert = fs.readFileSync(
  path.join(__dirname, "../../infra/certs/f164283e.crt")
)
const key = fs.readFileSync(
  path.join(__dirname, "../../infra/certs/f164283e.key")
)

describe("ST-SCAN-005: ALLOW case", () => {
  it("should allow access when CN matches subject_id", async () => {
    const agent = new https.Agent({
      cert,
      key,
      rejectUnauthorized: false,
    })

    const res = await axios.post(
      `${BASE_URL}/check`,
      {
        namespace: "tenant",
        object: "89e3e226-94ab-45ff-9982-02d03ce6261f",
        relation: "admin",
      },
      { httpsAgent: agent }
    )

    expect(res.data.allowed).toBe(true)
  })
})