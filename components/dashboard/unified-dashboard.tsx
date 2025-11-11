"use client"

import { useAuth } from "@/contexts/auth-context"
import { LabAdminDashboard } from "./lab-admin-dashboard"
import { OfficeAdminDashboard } from "./office-admin-dashboard"
import { SuperAdminDashboard } from "./superadmin-dashboard"
import { ConnectionProvider } from "@/contexts/connection-context"

export function UnifiedDashboard() {
  const { user } = useAuth()

  const getPrimaryRole = () => {
    if (user?.roles && Array.isArray(user.roles)) {
      if (user.roles.includes("superadmin")) return "superadmin"
      if (user.roles.includes("lab_admin")) return "lab_admin"
      if (user.roles.includes("office_admin")) return "office_admin"
      return user.roles[0] 
    }
    return user?.roles || "user"
  }

  const primaryRole = getPrimaryRole()

  return (
    <ConnectionProvider>
      {primaryRole === "superadmin" && <SuperAdminDashboard />}
      {primaryRole === "lab_admin" && <LabAdminDashboard />}
      {["office_admin", "doctor"].includes(primaryRole) && <OfficeAdminDashboard />}
      {!["superadmin", "lab_admin", "office_admin", "doctor"].includes(primaryRole) && (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">User Dashboard</h1>
          <p>Welcome to your dashboard. Please contact your administrator for more information.</p>
        </div>
      )}
    </ConnectionProvider>
  )
}
