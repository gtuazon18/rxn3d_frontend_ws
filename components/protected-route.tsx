"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout,token: authToken } = useAuth()
  const router = useRouter()


  useEffect(() => {
    if (!isLoading && !user && !authToken) {
      logout()
      // Redirect to login
      router.replace("/login")
    }
  }, [user, isLoading, router, logout, authToken])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-3 h-3 bg-[#1162A8] rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  // If not authenticated, don't render children
  if (!user) {
    return null
  }

  // If authenticated, render children
  return <>{children}</>
}
