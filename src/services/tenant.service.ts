import axios from "axios";

const KETO_ADMIN_URL = "http://localhost:4467";

export async function addUserToTenant(
  tenantId: string,
  userId: string
) {
  try {
    await axios.put(
      `${KETO_ADMIN_URL}/admin/relation-tuples`,
      {
        namespace: "tenant",
        object: tenantId,
        relation: "access",
        subject: userId
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Keto relation tuple created");
  } catch (error: any) {
    console.error(
      "❌ Failed to create Keto relation",
      error.response?.data || error.message
    );
    throw error;
  }
}
