import { json, readJson, registrationService, routeError } from "../_server"

export async function POST(request) {
  try {
    const body = await readJson(request)
    return json(await registrationService().verifyEdit(body))
  } catch (error) {
    return routeError(error)
  }
}
