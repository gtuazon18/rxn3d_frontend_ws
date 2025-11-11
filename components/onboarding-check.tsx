"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useOnboardingStatus } from "@/hooks/use-onboarding-status"

export function OnboardingCheck() {
  const { user, isNewUser } = useAuth()
  const { isOnboardingComplete, isLoading } = useOnboardingStatus()
  const router = useRouter()

  useEffect(() => {
    if (!user || isLoading) return;

    const isSuperAdmin = user.roles?.includes("superadmin");
    const customerId = localStorage.getItem("customerId");
    const isDifferentCustomer = user.customer?.id && user.customer.id !== Number(customerId);

    // Check if user needs onboarding
    if (
      isNewUser &&
      !isOnboardingComplete &&
      !isSuperAdmin &&
      (isDifferentCustomer || !customerId)
    ) {
      router.push("/onboarding/business-hours");
    }
  }, [user, isNewUser, isOnboardingComplete, isLoading, router]);

  return null
}
