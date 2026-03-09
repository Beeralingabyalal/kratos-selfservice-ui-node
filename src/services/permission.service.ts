import axios from "axios";

const KETO_READ_URL =
  process.env.KETO_READ_URL || "http://localhost:4466";

export async function checkTenantAccess(
  subject: string,
  tenantId: string,
  relation: string
): Promise<boolean> {

  const url = `${KETO_READ_URL}/relation-tuples/check`;

  console.log("KETO CHECK URL:", url);

  try {
    const res = await axios.get(url, {
      params: {
        namespace: "tenant",
        object: tenantId,
        relation,
        subject_id: subject,
      },
    });

    console.log("Keto check result:", res.data);
    return res.data.allowed === true;

  } catch (err: any) {
    console.error(
      "Keto permission check failed:",
      err.response?.data || err.message
    );
    return false;
  }
}
