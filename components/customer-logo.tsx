"use client"

import { useCustomerLogo } from "@/hooks/use-customer-logo"
import { useCustomerLogoStore } from "@/stores/customer-logo-store"
import { useEffect } from "react"
import { cn } from "@/lib/utils"

interface CustomerLogoProps {
  customerId: number | string | null | undefined
  fallbackLogo?: string | null
  alt?: string
  className?: string
  defaultSrc?: string
}

/**
 * Component that fetches and displays a customer logo from the API
 * Falls back to provided fallbackLogo, then defaultSrc
 */
export function CustomerLogo({
  customerId,
  fallbackLogo,
  alt = "Logo",
  className,
  defaultSrc = "/images/office-default.png",
}: CustomerLogoProps) {
  const { logoUrl: apiLogoUrl, isLoading } = useCustomerLogo(
    customerId,
    !!customerId
  )
  
  // Subscribe to specific customer logo in store
  const customerIdStr = customerId ? String(customerId) : null
  const storeLogoUrl = useCustomerLogoStore((state) => 
    customerIdStr ? state.logos[customerIdStr] || null : null
  )
  const setCustomerLogo = useCustomerLogoStore((state) => state.setCustomerLogo)
  const getCustomerLogo = useCustomerLogoStore((state) => state.getCustomerLogo)

  // Initialize logo from localStorage if not in store
  useEffect(() => {
    if (customerId && !storeLogoUrl && !apiLogoUrl) {
      const cachedLogo = getCustomerLogo(customerId)
      // getCustomerLogo updates the store if found in localStorage
    }
  }, [customerId, storeLogoUrl, apiLogoUrl, getCustomerLogo])

  // Update store when API logo is fetched
  useEffect(() => {
    if (apiLogoUrl && customerId) {
      setCustomerLogo(customerId, apiLogoUrl)
    }
  }, [apiLogoUrl, customerId, setCustomerLogo])

  // Priority: Store logo > API logo > fallback logo > default
  const logoSrc = 
    (storeLogoUrl && storeLogoUrl !== "/placeholder.svg")
      ? storeLogoUrl
      : (apiLogoUrl && apiLogoUrl !== "/placeholder.svg")
        ? apiLogoUrl
        : (fallbackLogo && fallbackLogo !== "/placeholder.svg")
          ? fallbackLogo
          : defaultSrc

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={cn("object-contain", className)}
      onError={(e) => {
        // Fallback to default if image fails to load
        const target = e.target as HTMLImageElement
        if (target.src !== defaultSrc) {
          target.src = defaultSrc
        }
      }}
    />
  )
}


