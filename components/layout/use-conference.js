"use client"

import { useEffect, useState } from "react"
import { apiService } from "@/lib/api-service"

export function useConference() {
  const [state, setState] = useState({
    conference: null,
    loading: true,
    error: "",
  })
  useEffect(() => {
    let current = true
    apiService
      .getActiveConference()
      .then((conference) => {
        if (current) setState({ conference, loading: false, error: "" })
      })
      .catch((error) => {
        if (current)
          setState({ conference: null, loading: false, error: error.message })
      })
    return () => {
      current = false
    }
  }, [])
  return state
}
