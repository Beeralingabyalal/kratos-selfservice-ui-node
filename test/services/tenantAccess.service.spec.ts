jest.mock("../../src/lib/db", () => ({
  pool: {
    query: jest.fn(),
  },
}))

import { pool } from "../../src/lib/db"
import * as service from "../../src/services/tenantAccess.service"

const mockQuery = pool.query as jest.Mock

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
})
