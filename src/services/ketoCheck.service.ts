import axios from "axios";

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://localhost:4466";

export async function checkPermission(
  subject: string,
  tenantId: string,
  role: string
): Promise<boolean> {

  const res = await axios.get(
    `${KETO_READ_URL}/check`,
    {
      params: {
        namespace: "tenant",
        object: tenantId,
        relation: role,
        subject_id: subject,
      },
    }
  );

  return res.data.allowed === true;
}
