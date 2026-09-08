import Link from "next/link"
import { redirect } from "next/navigation"
import { getExcursionCatalog } from "@/lib/excursions-server"
import { excursionDestination } from "@/lib/excursions"
export const dynamic = "force-dynamic"
export default async function ExploreUgandaPage({ searchParams }) {
  const { documents } = await getExcursionCatalog()
  const excursion = documents.find(item => item.promoted) || documents[0]
  const destination = excursion && excursionDestination(excursion, (await searchParams)?.from)
  if (destination) redirect(destination)
  return <main className="mx-auto max-w-3xl px-6 py-20"><h1 className="text-3xl font-bold">Explore Uganda</h1><p className="my-6">There are no published conference excursions at the moment.</p><Link href="/">Return to REC & EXPO</Link></main>
}
