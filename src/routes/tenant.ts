import { Router, Request, Response } from "express"

const router = Router()

router.get("/api/tenant/:tenantId", (req: Request, res: Response) => {
  const tenantId = req.params.tenantId

  res.json({
    message: "Tenant API working",
    tenantId: tenantId
  })
})

export default router
