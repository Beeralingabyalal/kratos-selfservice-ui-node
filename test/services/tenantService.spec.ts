import { createMultipleTenants } from "../../src/services/tenantService"
import * as db from "../../src/lib/db"
import * as accessSvc from "../../src/services/tenantAccess.service"

describe("tenantService — createMultipleTenants", () => {
  const mockQuery = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // mock transaction wrapper
    jest.spyOn(db, "withTransaction").mockImplementation(async (cb: any) => {
      return cb({ query: mockQuery })
    })

    jest
      .spyOn(accessSvc, "addUserToTenantRelation")
      .mockResolvedValue(undefined as any)
  })

  test("creates tenant when INSERT returns row", async () => {
    mockQuery
      // INSERT tenants
      .mockResolvedValueOnce({
        rows: [{ id: "t1", name: "TenantA" }],
      })
      // INSERT tenant_users
      .mockResolvedValueOnce({ rows: [] })

    const result = await createMultipleTenants(
      ["TenantA"],
      "user1"
    )

    expect(result).toEqual([{ id: "t1", name: "TenantA" }])

    expect(mockQuery).toHaveBeenCalledTimes(2)

    expect(accessSvc.addUserToTenantRelation)
      .toHaveBeenCalledWith("t1", "user1", "platform.admin")
  })

  test("falls back to SELECT when INSERT returns no rows", async () => {
    mockQuery
      // INSERT tenants → conflict → no rows
      .mockResolvedValueOnce({ rows: [] })
      // SELECT tenants fallback
      .mockResolvedValueOnce({
        rows: [{ id: "t2", name: "TenantB" }],
      })
      // INSERT tenant_users
      .mockResolvedValueOnce({ rows: [] })

    const result = await createMultipleTenants(
      ["TenantB"],
      "user2"
    )

    expect(result[0].id).toBe("t2")

    expect(mockQuery).toHaveBeenCalledTimes(3)

    expect(accessSvc.addUserToTenantRelation)
      .toHaveBeenCalledWith("t2", "user2", "platform.admin")
  })

  test("handles multiple tenants", async () => {
    mockQuery
      // tenant 1 insert
      .mockResolvedValueOnce({
        rows: [{ id: "t1", name: "A" }],
      })
      .mockResolvedValueOnce({ rows: [] })

      // tenant 2 insert
      .mockResolvedValueOnce({
        rows: [{ id: "t2", name: "B" }],
      })
      .mockResolvedValueOnce({ rows: [] })

    const result = await createMultipleTenants(
      ["A", "B"],
      "userX"
    )

    expect(result.length).toBe(2)

    expect(accessSvc.addUserToTenantRelation)
      .toHaveBeenCalledTimes(2)
  })
})
