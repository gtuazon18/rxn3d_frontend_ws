"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/contexts/auth-context"

// Types based on the screenshots
export interface CasePan {
  id: number
  name: string
  code: string
  quantity: number
  color_code: string
  status: "Active" | "Inactive"
  linkedCategories: string[]
  linkedProducts: string[]
  availableCodes: {
    used: number
    total: number
  }
  isRushGroup: boolean
  rushGroupLabel?: string
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

  // CRUD operations
  fetchCasePans: () => Promise<void>
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
  setRushGroup: (casePanId: number, isRush: boolean) => Promise<void>

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

  const { toast } = useToast()
  const { t } = useTranslation()
  const { user } = useAuth()

  const getAuthToken = () => {
    const token = localStorage.getItem("token")
    if (!token) throw new Error(t("authenticationTokenNotFound") || "Authentication token not found.")
    return token
  }

  const fetchCasePans = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/case-pans`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(t("failedToFetchCasePans") || "Failed to fetch case pans")
      }

      const data = await response.json()
      setCasePans(data.data || [])
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
  }, [toast, t])

  const createCasePan = useCallback(async (data: Partial<CasePan>) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/case-pans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(t("failedToCreateCasePan") || "Failed to create case pan")
      }

      toast({
        title: t("success") || "Success",
        description: t("casePanCreated") || "Case pan created successfully",
      })

      await fetchCasePans()
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

  const updateCasePan = useCallback(async (id: number, data: Partial<CasePan>) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/case-pans/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(t("failedToUpdateCasePan") || "Failed to update case pan")
      }

      toast({
        title: t("success") || "Success",
        description: t("casePanUpdated") || "Case pan updated successfully",
      })

      await fetchCasePans()
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

  const deleteCasePan = useCallback(async (id: number) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/case-pans/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(t("failedToDeleteCasePan") || "Failed to delete case pan")
      }

      toast({
        title: t("success") || "Success",
        description: t("casePanDeleted") || "Case pan deleted successfully",
      })

      await fetchCasePans()
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

  const duplicateCasePan = useCallback(async (id: number) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/case-pans/${id}/duplicate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(t("failedToDuplicateCasePan") || "Failed to duplicate case pan")
      }

      toast({
        title: t("success") || "Success",
        description: t("casePanDuplicated") || "Case pan duplicated successfully",
      })

      await fetchCasePans()
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
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/case-pans/${casePanId}/link-products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productIds }),
      })

      if (!response.ok) {
        throw new Error(t("failedToLinkProducts") || "Failed to link products")
      }

      toast({
        title: t("success") || "Success",
        description: t("productsLinked") || "Products linked successfully",
      })

      await fetchCasePans()
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

  const setRushGroup = useCallback(async (casePanId: number, isRush: boolean) => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/case-tracking/case-pans/${casePanId}/rush-group`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRush }),
      })

      if (!response.ok) {
        throw new Error(t("failedToUpdateRushGroup") || "Failed to update rush group")
      }

      toast({
        title: t("success") || "Success",
        description: t("rushGroupUpdated") || "Rush group updated successfully",
      })

      await fetchCasePans()
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

  const contextValue = useMemo(() => ({
    casePans,
    isLoading,
    error,
    selectedCasePan,
    fetchCasePans,
    createCasePan,
    updateCasePan,
    deleteCasePan,
    duplicateCasePan,
    linkProducts,
    fetchHistory,
    fetchReprintCases,
    printUpdatedSlips,
    setRushGroup,
    setSelectedCasePan,
  }), [
    casePans,
    isLoading,
    error,
    selectedCasePan,
    fetchCasePans,
    createCasePan,
    updateCasePan,
    deleteCasePan,
    duplicateCasePan,
    linkProducts,
    fetchHistory,
    fetchReprintCases,
    printUpdatedSlips,
    setRushGroup,
  ])

  return (
    <CaseTrackingContext.Provider value={contextValue}>
      {children}
    </CaseTrackingContext.Provider>
  )
}
