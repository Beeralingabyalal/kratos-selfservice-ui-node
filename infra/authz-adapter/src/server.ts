import express, { Request, Response } from "express"
import axios from "axios"
import pino from "pino"

const app = express()
app.use(express.json())

const logger = pino()

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://host.docker.internal:4466"

function extractCN(header?: string): string | null {
  if (!header) return null
  const match = header.match(/CN=([^;,"]+)/)
  return match ? match[1].trim() : null
}

app.all("/check", async (req: Request, res: Response) => {
  try {
    // 🔹 1. Extract subject (mTLS OR Oathkeeper)
    const xfcc = req.headers["x-forwarded-client-cert"] as string | undefined

    let subject: string | null = null
    let source = ""

    // 🔐 mTLS flow
    if (xfcc) {
      const cn = extractCN(xfcc)
      if (cn) {
        subject = `service:${cn}`
        source = "mtls"
      }
    }

    // 👤 Oathkeeper flow
    if (!subject) {
      const user =
        (req.headers["x-subject"] as string) ||
        (req.headers["x-user"] as string)

      if (user) {
        subject = `user:${user}`
        source = "session"
      }
    }

    if (!subject) {
      logger.warn({ msg: "No subject found" })
      return res.status(403).json({ allowed: false })
    }

    // 🔹 2. Extract tenant (object)
    let object = req.body.object

    if (!object) {
      const forwardedUri =
        (req.headers["x-forwarded-uri"] as string) || req.url

      const parts = forwardedUri.split("/")
      if (parts.length >= 4){
        object = parts[3] // /api/tenant/<tenantId>
      }else if(parts.length >= 2){
        object = parts[1]
      }
    }

    const namespace = req.body.namespace || "tenant"

    // 🔹 3. Relation (role)
    const relation = req.body.relation || "platform.admin"

    // 🔥 4. Single Keto check (NO Kratos call)
    const response = await axios.get(`${KETO_ADMIN_URL}/check`, {
      params: {
        namespace,
        object,
        relation,
        subject_id: subject,
      },
    })

    const allowed = response.data.allowed

    // 📊 Structured audit log
    logger.info({
      actor: subject,
      object,
      relation,
      result: allowed ? "allow" : "deny",
      source,
    })

    return res.json({ allowed })

  } catch (err) {
    logger.error(err)
    return res.status(500).json({ allowed: false })
  }
})

export default app

if (require.main === module) {
  app.listen(3001, () => {
    console.log("AuthZ Adapter running on port 3001")
  })
}