"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/login-form"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard")
    }
  }, [user, isLoading, router])

  // Don't show loading dots - just redirect immediately when user is authenticated
  if (isLoading || user) {
    return null
  }

  return (
    <div className="items-center justify-center">
      <div className="w-full">
        <LoginForm />
      </div>
    </div>
  )
}
