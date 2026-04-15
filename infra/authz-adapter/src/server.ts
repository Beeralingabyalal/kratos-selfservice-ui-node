import express, { Request, Response } from "express"
import axios from "axios"
import pino from "pino"

const app = express()
app.use(express.json())

const logger = pino()

const KETO_ADMIN_URL =
  process.env.KETO_ADMIN_URL || "http://keto:4466"

function extractCN(header?: string): string | null {
  if (!header) return null
  const match = header.match(/CN=([^;,"]+)/)
  return match ? match[1].trim() : null
}

app.all("/check", async (req: Request, res: Response) => {
  try {
    const xfcc = req.headers["x-forwarded-client-cert"] as string | undefined

    let subject: string | null = null
    let source = ""

    // mTLS
    if (xfcc) {
      const cn = extractCN(xfcc)
      if (cn) {
        subject = cn
        source = "mtls"
      }

      console.log("XFCC HEADER:", xfcc)
      console.log("EXTRACTED CN:", cn)
      console.log("final subject:", subject)
    }

    // Oathkeeper
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
      return res.status(403).json({ allowed: false })
    }

    let object = req.body.object

    if (!object) {
      const forwardedUri =
        (req.headers["x-forwarded-uri"] as string) || req.url

      const parts = forwardedUri.split("/")
      object = parts[3] || parts[1]
    }

    const namespace = req.body.namespace || "tenant"

    // 🔥 Make relation dynamic (important improvement)
    const relation =
      req.body.relation ||
      (req.headers["x-roles"] as string) ||
      "platform.user"

    const response = await axios.get(`${KETO_ADMIN_URL}/relation-tuples/check`, {
      params: {
        namespace,
        object,
        relation,
        subject_id: subject,
      },
    })

    const allowed = response.data.allowed

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
  app.listen(3000, () => {
    console.log("AuthZ Adapter running on port 3000")
  })
}