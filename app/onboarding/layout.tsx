"use client"

import type React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isNewUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname() || ""

  // No redirect, just show the current page

  // Calculate progress based on current path
  const getProgress = () => {
    switch (pathname) {
      case "/onboarding/welcome":
        return 0
      case "/onboarding/lab-profile":
      case "/onboarding/user-profile":
        return 20
      case "/onboarding/business-hours":
        return 40
      case "/onboarding/services":
      case "/onboarding/products":
        return 60
      case "/onboarding/product-grades":
        return 80
      case "/onboarding/attachments":
        return 95
      case "/onboarding/invite-users":
        return 97
      case "/onboarding/completion":
        return 99
      default:
        return 0
    }
  }

  // Don't show progress bar on welcome page
  const showProgress = pathname !== "/onboarding/welcome"

  return <div className="min-h-screen bg-[#f2f8ff]">{children}</div>
}
