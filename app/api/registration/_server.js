import { NextResponse } from "next/server"
import { serverConfig, serverDatabases, serverQuery } from "@/lib/appwrite-server"
import { createRegistrationMailer } from "@/lib/registration-mailer"
import { createRegistrationService } from "@/lib/registration-service"

export function registrationService() {
  return createRegistrationService({
    databases: serverDatabases,
    query: serverQuery,
    config: serverConfig,
    mailer: createRegistrationMailer({
      emailApiUrl: serverConfig.emailApiUrl,
      otpEmailApiUrl: serverConfig.otpEmailApiUrl,
    }),
  })
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status })
}

export function routeError(error) {
  const status = Number(error.status) || 500
  const message = status >= 500 ? "Registration service is unavailable" : error.message
  if (status >= 500) {
    console.error(error)
  }
  return json({ error: message }, status)
}
