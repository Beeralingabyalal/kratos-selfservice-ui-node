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

app.post("/check", async (req: Request, res: Response) => {
  try {
    const xfcc = req.headers["x-forwarded-client-cert"] as string | undefined
    const clientCN = extractCN(xfcc)

    logger.info({ xfcc, clientCN }, "Extracted client certificate CN")

    if (!clientCN) {
      return res.status(403).json({ allowed: false })
    }

    const { namespace, object, relation } = req.body

    const response = await axios.post(
      `${KETO_ADMIN_URL}/relation-tuples/check`,
      {
        namespace,
        object,
        relation,
        subject_id: clientCN
      }
    )

    return res.json({ allowed: response.data.allowed })

  } catch (err) {
    logger.error(err)
    return res.status(500).json({ allowed: false })
  }
})

app.listen(3000, () => {
  console.log("AuthZ Adapter running on port 3000")
})