import crypto from "node:crypto"

export async function synchronizeRegistrationBadge(registration) {
  const secret = process.env.REC_REGISTRATION_SYNC_SECRET
  if (!secret || secret.length < 32) throw new Error("Badge synchronization is not configured.")
  const body = JSON.stringify({ registrationId: registration.$id })
  const timestamp = String(Date.now())
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
  const base = String(process.env.HR_PORTAL_BASE_URL || "https://hr.nrep.ug").replace(/\/$/, "")
  const response = await fetch(`${base}/api/rec/scanning/registration-sync`, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(20000), headers: { "Content-Type": "application/json", "X-REC-Timestamp": timestamp, "X-REC-Signature": signature }, body })
  if (!response.ok) throw new Error("Badge registration synchronization failed.")
}
