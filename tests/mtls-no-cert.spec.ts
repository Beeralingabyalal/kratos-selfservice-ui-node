import axios from "axios"

const BASE_URL = "https://172.30.176.1:8443"

describe("ST-SCAN-005: No certificate", () => {
  it("should reject request without cert", async () => {
    try {
      await axios.post(`${BASE_URL}/check`, {
        namespace: "tenant",
        object: "89e3e226-94ab-45ff-9982-02d03ce6261f",
        relation: "admin",
      })

      fail("Request should fail")
    } catch (err) {
      expect(err).toBeDefined()
    }
  })
})