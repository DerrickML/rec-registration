"use client"
import Link from "next/link"
export default function ExcursionError({ reset }) {
  return <main className="mx-auto max-w-3xl px-6 py-20"><h1 className="text-2xl font-bold">Excursion details are temporarily unavailable</h1><p className="my-6">Please try again shortly.</p><button onClick={reset} className="rounded-md bg-[#176F91] px-5 py-3 text-white">Try again</button><Link href="/" className="ml-6 underline">Return to REC & EXPO</Link></main>
}
