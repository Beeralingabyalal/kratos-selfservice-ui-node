jest.mock("axios", () => ({
  put: jest.fn(),
}))

jest.mock("../../src/lib/db", () => ({
  pool: {
    query: jest.fn(),
  },
}))

import { pool } from "../../src/lib/db"
import axios from "axios"
import * as service from "../../src/services/tenantAccess.service"

const mockQuery = pool.query as jest.Mock
const mockAxiosPut = axios.put as jest.Mock

describe("tenantAccess.service — checkTenantAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("returns true when access row exists", async () => {
    mockQuery.mockResolvedValue({ rows: [{ ok: 1 }] })

    const result = await service.checkTenantAccess(
      "t1",
      "u1",
      "admin"
    )

    expect(mockQuery).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  test("returns false when no row", async () => {
    mockQuery.mockResolvedValue({ rows: [] })

    const result = await service.checkTenantAccess(
      "t1",
      "u1",
      "admin"
    )

    expect(result).toBe(false)
  })

  test("throws when db fails", async () => {
    mockQuery.mockRejectedValue(new Error("db error"))

    await expect(
      service.checkTenantAccess("t1", "u1", "admin")
    ).rejects.toThrow("db error")
  })

  test("addUserToTenantRelation ignores duplicate tuple errors", async () => {
    mockAxiosPut.mockRejectedValue({
      response: { status: 409 },
    })

    await expect(
      service.addUserToTenantRelation("t1", "u1", "platform.admin")
    ).resolves.toBeUndefined()
  })

  test("addUserToTenantRelation throws non-duplicate errors", async () => {
    mockAxiosPut.mockRejectedValue({
      response: { status: 500, data: "boom" },
      message: "boom",
    })

    await expect(
      service.addUserToTenantRelation("t1", "u1", "platform.admin")
    ).rejects.toBeTruthy()
  })
})
