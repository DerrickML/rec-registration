import { Suspense } from "react"
import MobileAppPage from "@/components/mobile-apps/mobile-app-page"
export const metadata = { title: "REC mobile app", description: "Download the official REC & EXPO app for Android and iPhone." }
export default function AppPage() { return <Suspense fallback={<main className="site-container py-32" role="status">Loading the REC app...</main>}><MobileAppPage /></Suspense> }
