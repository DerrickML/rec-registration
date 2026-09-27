import { Suspense } from "react"
import ExhibitorPortal from "@/components/exhibitors/exhibitor-portal"
import "@/components/exhibitors/exhibitors.css"
export const metadata = {
  title: "Apply to Exhibit | REC & EXPO",
  description: "Submit and manage your company's REC exhibition application."
}
export default function Page() {
  return (
    <Suspense
      fallback={
        <p style={{ padding: "120px 24px" }}>
          Loading exhibition applications...
        </p>
      }
    >
      <ExhibitorPortal />
    </Suspense>
  )
}
