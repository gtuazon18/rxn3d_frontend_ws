"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import MultipleLocation from "@/components/multiple-location-form"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/protected-route"

export default function MultipleLocationPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [user, isLoading, router])

  // Show nothing while checking auth or redirecting
  if (isLoading || !user) {
    return null
  }

  return (
    <ProtectedRoute>
      <MultipleLocation />
    </ProtectedRoute>
  )
}
