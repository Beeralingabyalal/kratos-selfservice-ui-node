import axios from "axios"
import https from "https"
import fs from "fs"
import path from "path"

const BASE_URL = "https://172.30.176.1:8443"

const cert = fs.readFileSync(
  path.join(__dirname, "../../infra/certs/client-uuid.crt")
)
const key = fs.readFileSync(
  path.join(__dirname, "../../infra/certs/client-uuid.key")
)

describe("ST-SCAN-005: Invalid identity", () => {
  it("should deny access for wrong CN", async () => {
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

    expect(res.data.allowed).toBe(false)
  })
})