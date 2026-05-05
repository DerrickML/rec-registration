import { json, registrationService, routeError } from "../_server"

export async function GET() {
  try {
    return json(await registrationService().exhibitorCapacity())
  } catch (error) {
    return routeError(error)
  }
}
