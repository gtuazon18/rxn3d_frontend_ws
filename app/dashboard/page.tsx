"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { Header } from "@/components/header"
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard"
import { useAuth } from "@/contexts/auth-context"

export default function Dashboard() {
  const router = useRouter()
  const { user, setCustomerId } = useAuth()

  const MULTI_LOCATION_ROLES = ["lab_admin", "lab_user", "office_admin", "office_user"]

  useEffect(() => {
    if (user) {
      const userRoles = user.roles || (user.role ? [user.role] : [])
      const shouldSeeMultiLocation = userRoles.some((role) => MULTI_LOCATION_ROLES.includes(role))
  
      if (shouldSeeMultiLocation) {
        const selectedLocation = localStorage.getItem("selectedLocation")
        
        if (!selectedLocation) {
          const customers = user.customers || []
          
          if (customers.length === 1) {
            // Handle single customer case - don't redirect to multi-location
            const singleCustomer = customers[0]
            setCustomerId(singleCustomer.id).then(() => {
              localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
            }).catch((error) => {
              console.error("Failed to set customer ID:", error)
              localStorage.setItem("selectedLocation", JSON.stringify(singleCustomer))
            })
          } else if (customers.length > 1) {
            router.replace("/multiple-location")
          }
        }
      }
    }
  }, [user, router, setCustomerId])

  return (
    <div className="flex h-screen bg-[#F9F9F9] overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onNewSlip={() => window.dispatchEvent(new Event("open-dental-slip"))} />
        <div className="flex-1 overflow-auto">
          <UnifiedDashboard />
        </div>
      </div>
    </div>
  )
}
