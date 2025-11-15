"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/contexts/auth-context"

// Helper function to get customer ID
const getCustomerId = (user: any): number | null => {
  if (typeof window === "undefined") return null
  
  // First try to get from localStorage
  const storedCustomerId = localStorage.getItem("customerId")
  if (storedCustomerId) {
    return parseInt(storedCustomerId, 10)
  }

  // Then try to get from user's customers array
  if (user?.customers && user.customers.length > 0) {
    return user.customers[0].id
  }

  // If user has a customer_id property
  if (user?.customer_id) {
    return user.customer_id
  }

  // If user has a customer object
  if (user?.customer?.id) {
    return user.customer.id
  }

  return null
}

// Types based on the API documentation
export interface CasePan {
  id: number
  name: string
  code: string
  quantity?: number
  color_code: string
  code_format?: "Numeric" | "Alphanumeric" | null
  set_as_rush_group?: boolean
  type?: "Upper" | "Lower" | "Both"
  status: "Active" | "Inactive"
  connected_items?: string[] // Combined subcategories and products
  linkedCategories?: string[]
  linkedProducts?: string[]
  availableCodes?: {
    used: number
    total: number
    overcapacity?: boolean
    full?: boolean
  }
  isRushGroup?: boolean
  rushGroupLabel?: string
  lab_case_pan?: {
    id: number
    code_format?: "Numeric" | "Alphanumeric" | null
    set_as_rush_group?: boolean
    quantity: number
    color_code: string
    status: "Active" | "Inactive"
  }
}

export interface CaseHistoryEntry {
  id: number
  date: string
  user: string
  action: string
  details: string
}

export interface ReprintCase {
  id: string
  caseId: string
  patient: string
  previousCode: string
  currentCode: string
  status: string
  reason: string
  needsReprint: boolean
}

type CaseTrackingContextType = {
  casePans: CasePan[]
  isLoading: boolean
  error: string | null
  selectedCasePan: CasePan | null
  currentRushGroup: string | null

  // CRUD operations
  fetchCasePans: (customerId?: number) => Promise<void>
  createCasePan: (data: Partial<CasePan>) => Promise<void>
  updateCasePan: (id: number, data: Partial<CasePan>) => Promise<void>
  deleteCasePan: (id: number) => Promise<void>
  duplicateCasePan: (id: number) => Promise<void>

  // Link operations
  linkProducts: (casePanId: number, productIds: number[]) => Promise<void>

  // History operations
  fetchHistory: (casePanId: number) => Promise<CaseHistoryEntry[]>

  // Reprint operations
  fetchReprintCases: (casePanId: number) => Promise<ReprintCase[]>
  printUpdatedSlips: (caseIds: string[]) => Promise<void>

  // Rush group operations
  toggleRushGroup: (casePanId: number, customerId: number) => Promise<void>
  setRushGroup: (casePanId: number, isRush: boolean) => Promise<void>

  // Case pan color code toggle
  toggleCasePanColorCode: (customerId: number) => Promise<boolean>

  // Assignment operations
  getAssignments: (customerId: number) => Promise<any>
  setAssignments: (customerId: number, casePanIds: number[], assignments: { subcategories?: number[], products?: number[] }) => Promise<void>

  // UI state
  setSelectedCasePan: (casePan: CasePan | null) => void
}

const CaseTrackingContext = createContext<CaseTrackingContextType | undefined>(undefined)

export const useCaseTracking = () => {
  const context = useContext(CaseTrackingContext)
  if (context === undefined) {
    throw new Error("useCaseTracking must be used within a CaseTrackingProvider")
  }
  return context
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

export const CaseTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [casePans, setCasePans] = useState<CasePan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCasePan, setSelectedCasePan] = useState<CasePan | null>(null)
  const [currentRushGroup, setCurrentRushGroup] = useState<string | null>(null)

  const { toast } = useToast()
  const { t } = useTranslation()
  const { user } = useAuth()

  const getAuthToken = () => {
    const token = localStorage.getItem("token")
    if (!token) throw new Error(t("authenticationTokenNotFound") || "Authentication token not found.")
    return token
  }

  const fetchCasePans = useCallback(async (customerId?: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const token = getAuthToken()
      const customerIdToUse = customerId || getCustomerId(user)
      
      // Build query string
      const queryParams = new URLSearchParams()
      if (customerIdToUse) {
        queryParams.append("customer_id", String(customerIdToUse))
      }
      
      const url = `${API_BASE_URL}/library/case-pans${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(t("failedToFetchCasePans") || "Failed to fetch case pans")
      }

      const data = await response.json()
      // Transform API response to match our CasePan interface
      const transformedPans = (data.data?.data || data.data || []).map((pan: any) => ({
        id: pan.id,
        name: pan.name,
        code: pan.code,
        quantity: pan.lab_case_pan?.quantity || pan.quantity,
        color_code: pan.color_code || pan.lab_case_pan?.color_code,
        code_format: pan.code_format || pan.lab_case_pan?.code_format,
        set_as_rush_group: pan.set_as_rush_group ?? pan.lab_case_pan?.set_as_rush_group ?? false,
        status: pan.lab_case_pan?.status || pan.status || "Active",
        connected_items: pan.connected_items || [],
        linkedCategories: pan.connected_items?.filter((item: string) => item) || [],
        linkedProducts: [],
        availableCodes: {
          used: pan.availableCodes?.used || 0,
          total: pan.availableCodes?.total || pan.quantity || 0,
          overcapacity: pan.availableCodes?.overcapacity,
          full: pan.availableCodes?.full,
        },
        isRushGroup: pan.set_as_rush_group ?? pan.lab_case_pan?.set_as_rush_group ?? false,
        lab_case_pan: pan.lab_case_pan,
      }))
      
      setCasePans(transformedPans)
      
      // Update current rush group
      const rushPan = transformedPans.find((pan: CasePan) => pan.isRushGroup)
      if (rushPan) {
        setCurrentRushGroup(`${rushPan.name} - ${rushPan.code}`)
      }
    } catch (err: any) {
      setError(err.message)
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, t, user])

  const createCasePan = useCallback(async (data: Partial<CasePan>) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const customerId = getCustomerId(user)
      
      if (!customerId) {
        throw new Error(t("customerIdRequired") || "Customer ID is required")
      }

      // Transform data to match API format
      const payload: any = {
        name: data.name,
        code: data.code,
        color_code: data.color_code,
        type: data.type || "Both",
        status: data.status || "Active",
        customer_id: customerId,
        quantity: data.quantity || 0,
      }

      if (data.code_format) {
        payload.code_format = data.code_format
      }
      if (data.set_as_rush_group !== undefined) {
        payload.set_as_rush_group = data.set_as_rush_group
      }

      const response = await fetch(`${API_BASE_URL}/library/case-pans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || t("failedToCreateCasePan") || "Failed to create case pan")
      }

      toast({
        title: t("success") || "Success",
        description: t("casePanCreated") || "Case pan created successfully",
      })

      await fetchCasePans(customerId)
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchCasePans, toast, t, user])

  const updateCasePan = useCallback(async (id: number, data: Partial<CasePan>) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const customerId = getCustomerId(user)
      
      if (!customerId) {
        throw new Error(t("customerIdRequired") || "Customer ID is required")
      }

      // Transform data to match API format
      const payload: any = {
        customer_id: customerId,
      }

      if (data.name) payload.name = data.name
      if (data.code) payload.code = data.code
      if (data.color_code) payload.color_code = data.color_code
      if (data.type) payload.type = data.type
      if (data.status) payload.status = data.status
      if (data.quantity !== undefined) payload.quantity = data.quantity
      if (data.code_format !== undefined) payload.code_format = data.code_format
      if (data.set_as_rush_group !== undefined) payload.set_as_rush_group = data.set_as_rush_group

      const response = await fetch(`${API_BASE_URL}/library/case-pans/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || t("failedToUpdateCasePan") || "Failed to update case pan")
      }

      toast({
        title: t("success") || "Success",
        description: t("casePanUpdated") || "Case pan updated successfully",
      })

      await fetchCasePans(customerId)
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchCasePans, toast, t, user])

  const deleteCasePan = useCallback(async (id: number) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const customerId = getCustomerId(user)
      
      const response = await fetch(`${API_BASE_URL}/library/case-pans/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || t("failedToDeleteCasePan") || "Failed to delete case pan")
      }

      toast({
        title: t("success") || "Success",
        description: t("casePanDeleted") || "Case pan deleted successfully",
      })

      await fetchCasePans(customerId || undefined)
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchCasePans, toast, t, user])

  const duplicateCasePan = useCallback(async (id: number) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const customerId = getCustomerId(user)
      
      // First fetch the case pan to duplicate
      const getResponse = await fetch(`${API_BASE_URL}/library/case-pans/${id}?customer_id=${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!getResponse.ok) {
        throw new Error(t("failedToFetchCasePan") || "Failed to fetch case pan")
      }

      const casePanData = await getResponse.json()
      const originalPan = casePanData.data

      // Create a new case pan with similar data
      const duplicateData: any = {
        name: `${originalPan.name} (Copy)`,
        code: originalPan.code,
        color_code: originalPan.color_code || originalPan.lab_case_pan?.color_code,
        type: originalPan.type || "Both",
        status: "Active",
        customer_id: customerId,
        quantity: originalPan.lab_case_pan?.quantity || 0,
      }

      if (originalPan.code_format || originalPan.lab_case_pan?.code_format) {
        duplicateData.code_format = originalPan.code_format || originalPan.lab_case_pan.code_format
      }

      const response = await fetch(`${API_BASE_URL}/library/case-pans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(duplicateData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || t("failedToDuplicateCasePan") || "Failed to duplicate case pan")
      }

      toast({
        title: t("success") || "Success",
        description: t("casePanDuplicated") || "Case pan duplicated successfully",
      })

      await fetchCasePans(customerId || undefined)
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchCasePans, toast, t, user])

  // Set case pan assignments (defined before linkProducts to avoid dependency issues)
  const setAssignments = useCallback(async (
    customerId: number,
    casePanIds: number[],
    assignments: { subcategories?: number[], products?: number[] }
  ): Promise<void> => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/library/case-pans/assignments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId,
          case_pan_ids: casePanIds,
          assignments,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || t("failedToSetAssignments") || "Failed to set assignments")
      }

      toast({
        title: t("success") || "Success",
        description: t("assignmentsUpdated") || "Assignments updated successfully",
      })

      await fetchCasePans(customerId)
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchCasePans, toast, t])

  const linkProducts = useCallback(async (casePanId: number, productIds: number[]) => {
    const customerId = getCustomerId(user)
    if (!customerId) {
      toast({
        title: t("error") || "Error",
        description: t("customerIdRequired") || "Customer ID is required",
        variant: "destructive",
      })
      return
    }
    // Use setAssignments API to link products
    await setAssignments(customerId, [casePanId], { products: productIds })
  }, [user, toast, t, setAssignments])

  const fetchHistory = useCallback(async (casePanId: number): Promise<CaseHistoryEntry[]> => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/case-pans/${casePanId}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(t("failedToFetchHistory") || "Failed to fetch history")
      }

      const data = await response.json()
      return data.data || []
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
      return []
    }
  }, [toast, t])

  const fetchReprintCases = useCallback(async (casePanId: number): Promise<ReprintCase[]> => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/case-pans/${casePanId}/reprint-cases`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(t("failedToFetchReprintCases") || "Failed to fetch reprint cases")
      }

      const data = await response.json()
      return data.data || []
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
      return []
    }
  }, [toast, t])

  const printUpdatedSlips = useCallback(async (caseIds: string[]) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/print-slips`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ caseIds }),
      })

      if (!response.ok) {
        throw new Error(t("failedToPrintSlips") || "Failed to print slips")
      }

      toast({
        title: t("success") || "Success",
        description: t("slipsPrinted") || "Slips printed successfully",
      })
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, t])

  const toggleRushGroup = useCallback(async (casePanId: number, customerId: number) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/library/case-pans/toggle-rush-group`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ case_pan_id: casePanId, customer_id: customerId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || t("failedToUpdateRushGroup") || "Failed to update rush group")
      }

      const data = await response.json()
      const updatedPan = data.data?.case_pan

      // Update current rush group
      if (updatedPan?.set_as_rush_group) {
        setCurrentRushGroup(`${updatedPan.name} - ${updatedPan.code || ''}`)
      } else {
        setCurrentRushGroup(null)
      }

      toast({
        title: t("success") || "Success",
        description: t("rushGroupUpdated") || "Rush group updated successfully",
      })

      await fetchCasePans(customerId)
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchCasePans, toast, t])

  const setRushGroup = useCallback(async (casePanId: number, isRush: boolean) => {
    const customerId = getCustomerId(user)
    if (!customerId) {
      toast({
        title: t("error") || "Error",
        description: t("customerIdRequired") || "Customer ID is required",
        variant: "destructive",
      })
      return
    }
    // Use toggle if setting to true, otherwise update directly
    if (isRush) {
      await toggleRushGroup(casePanId, customerId)
    } else {
      // If setting to false, we still need to toggle (which will turn it off)
      await toggleRushGroup(casePanId, customerId)
    }
  }, [toggleRushGroup, user, toast, t])

  // Toggle case pan color code
  const toggleCasePanColorCode = useCallback(async (customerId: number): Promise<boolean> => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/customers/toggle-case-pan-color-code`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customer_id: customerId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || t("failedToToggleColorCode") || "Failed to toggle color code")
      }

      const data = await response.json()
      toast({
        title: t("success") || "Success",
        description: t("colorCodeToggled") || "Color code setting updated successfully",
      })

      return data.data?.case_pan_color_code ?? false
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [toast, t])

  // Get case pan assignments
  const getAssignments = useCallback(async (customerId: number): Promise<any> => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/library/case-pans/assignments?customer_id=${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || t("failedToFetchAssignments") || "Failed to fetch assignments")
      }

      const data = await response.json()
      return data.data || { case_pans: [], assignments: { subcategories: {}, products: {} } }
    } catch (err: any) {
      toast({
        title: t("error") || "Error",
        description: err.message,
        variant: "destructive",
      })
      return { case_pans: [], assignments: { subcategories: {}, products: {} } }
    }
  }, [toast, t])


  const contextValue = useMemo(() => ({
    casePans,
    isLoading,
    error,
    selectedCasePan,
    currentRushGroup,
    fetchCasePans,
    createCasePan,
    updateCasePan,
    deleteCasePan,
    duplicateCasePan,
    linkProducts,
    fetchHistory,
    fetchReprintCases,
    printUpdatedSlips,
    toggleRushGroup,
    setRushGroup,
    toggleCasePanColorCode,
    getAssignments,
    setAssignments,
    setSelectedCasePan,
  }), [
    casePans,
    isLoading,
    error,
    selectedCasePan,
    currentRushGroup,
    fetchCasePans,
    createCasePan,
    updateCasePan,
    deleteCasePan,
    duplicateCasePan,
    linkProducts,
    fetchHistory,
    fetchReprintCases,
    printUpdatedSlips,
    toggleRushGroup,
    setRushGroup,
    toggleCasePanColorCode,
    getAssignments,
    setAssignments,
  ])

  return (
    <CaseTrackingContext.Provider value={contextValue}>
      {children}
    </CaseTrackingContext.Provider>
  )
}
