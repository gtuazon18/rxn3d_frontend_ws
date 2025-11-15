"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Link as LinkIcon, Clock, Printer, Copy, MoreVertical, Zap, Edit, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "react-i18next"
import { useCaseTracking } from "@/contexts/case-tracking-context"
import { useAuth } from "@/contexts/auth-context"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { AddCasePanTrackingModal } from "./add-case-pan-tracking-modal"
import { DuplicateCasePanModal } from "./duplicate-case-pan-modal"
import { LinkProductModal } from "./link-product-modal"
import { HistoryModal } from "./history-modal"
import { ReprintSlipsModal } from "./reprint-slips-modal"
import { ChangeRushGroupModal } from "./change-rush-group-modal"

export function CaseTrackingPage() {
  const { t } = useTranslation()
  const { 
    casePans, 
    fetchCasePans, 
    deleteCasePan, 
    toggleRushGroup,
    toggleCasePanColorCode,
    currentRushGroup,
    isLoading
  } = useCaseTracking()
  const { user: authUser } = useAuth()

  const defaultLabel = t("caseTracking.casePanTrackingSystem", "Case Pan Tracking System")
  const [customLabel, setCustomLabel] = usePersistedState<string>("casePanTrackingLabel", defaultLabel)
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editLabelValue, setEditLabelValue] = useState(customLabel)
  const labelInputRef = useRef<HTMLInputElement>(null)

  // Update editLabelValue when customLabel changes
  useEffect(() => {
    if (!isEditingLabel) {
      setEditLabelValue(customLabel)
    }
  }, [customLabel, isEditingLabel])

  const [searchQuery, setSearchQuery] = useState("")
  const [showEntries, setShowEntries] = useState("20")
  const [enableColorCoding, setEnableColorCoding] = useState(true)
  
  // Get customer ID helper
  const getCustomerId = (): number | null => {
    if (typeof window === "undefined") return null
    const storedCustomerId = localStorage.getItem("customerId")
    if (storedCustomerId) return parseInt(storedCustomerId, 10)
    if (authUser?.customers && authUser.customers.length > 0) return authUser.customers[0].id
    if (authUser?.customer_id) return authUser.customer_id
    if (authUser?.customer?.id) return authUser.customer.id
    return null
  }

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [isLinkProductModalOpen, setIsLinkProductModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false)
  const [isChangeRushModalOpen, setIsChangeRushModalOpen] = useState(false)
  const [selectedCasePan, setSelectedCasePan] = useState<any>(null)

  // Selected items for bulk actions
  const [selectedItems, setSelectedItems] = useState<number[]>([])

  useEffect(() => {
    const customerId = getCustomerId()
    fetchCasePans(customerId || undefined)
  }, [fetchCasePans])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus()
      labelInputRef.current.select()
    }
  }, [isEditingLabel])

  const handleStartEditLabel = () => {
    setEditLabelValue(customLabel)
    setIsEditingLabel(true)
  }

  const handleSaveLabel = () => {
    const trimmedValue = editLabelValue.trim()
    if (trimmedValue) {
      setCustomLabel(trimmedValue)
      // Dispatch custom event to notify sidebar of the change
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("casePanTrackingLabelChanged"))
      }
    } else {
      setEditLabelValue(customLabel)
    }
    setIsEditingLabel(false)
  }

  const handleCancelEditLabel = () => {
    setEditLabelValue(customLabel)
    setIsEditingLabel(false)
  }

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveLabel()
    } else if (e.key === "Escape") {
      handleCancelEditLabel()
    }
  }

  // Filter case pans based on search query
  const filteredCasePans = casePans.filter((pan) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      pan.name.toLowerCase().includes(query) ||
      pan.code.toLowerCase().includes(query)
    )
  })

  // Limit displayed entries
  const displayedCasePans = filteredCasePans.slice(0, parseInt(showEntries) || 20)

  const handleToggleSelect = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedItems.length === displayedCasePans.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(displayedCasePans.map((cp) => cp.id))
    }
  }

  const handleEdit = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsEditModalOpen(true)
  }

  const handleDuplicate = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsDuplicateModalOpen(true)
  }

  const handleLinkProduct = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsLinkProductModalOpen(true)
  }

  const handleHistory = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsHistoryModalOpen(true)
  }

  const handleReprint = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsReprintModalOpen(true)
  }

  const handleToggleRushGroup = async (casePan: any) => {
    const customerId = getCustomerId()
    if (!customerId) {
      alert(t("caseTracking.customerIdRequired", "Customer ID is required"))
      return
    }
    await toggleRushGroup(casePan.id, customerId)
  }

  const handleToggleColorCoding = async () => {
    const customerId = getCustomerId()
    if (!customerId) {
      alert(t("caseTracking.customerIdRequired", "Customer ID is required"))
      return
    }
    try {
      await toggleCasePanColorCode(customerId)
      // The toggle will update the state, but we need to refresh the list
      fetchCasePans(customerId)
    } catch (error) {
      // Error is already handled in the context
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm(t("caseTracking.confirmDelete", "Are you sure you want to delete this case pan?"))) {
      await deleteCasePan(id)
    }
  }

  const getAvailabilityBar = (used: number, total: number, overcapacity?: boolean, full?: boolean) => {
    const percentage = Math.min((used / total) * 100, 100)
    let colorClass = "bg-green-500"
    if (overcapacity) colorClass = "bg-red-500"
    else if (full) colorClass = "bg-red-500"
    else if (percentage > 70) colorClass = "bg-yellow-500"

    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${colorClass} transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          {used} / {total}
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="bg-white rounded-lg border">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isEditingLabel ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={labelInputRef}
                  value={editLabelValue}
                  onChange={(e) => setEditLabelValue(e.target.value)}
                  onKeyDown={handleLabelKeyDown}
                  onBlur={handleSaveLabel}
                  className="text-xl font-semibold h-9 w-auto min-w-[300px]"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={handleSaveLabel}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleCancelEditLabel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold">{customLabel}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={handleStartEditLabel}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">{t("caseTracking.enableColorCoding", "Enable Color Coding")}</span>
            <Switch
              checked={enableColorCoding}
              onCheckedChange={(checked) => {
                setEnableColorCoding(checked)
                if (checked !== enableColorCoding) {
                  handleToggleColorCoding()
                }
              }}
              className="data-[state=checked]:bg-[#1162a8]"
            />
          </div>
        </div>

        {/* Current Rush Group Banner */}
        {currentRushGroup && (
          <div className="px-6 py-3 bg-yellow-50 border-b flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600 fill-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              {t("caseTracking.currentRushGroup", "Current Rush Group")}: {currentRushGroup}
            </span>
          </div>
        )}

        {/* Toolbar */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#1162a8] hover:bg-[#0f5490]">
              <Plus className="h-4 w-4 mr-2" />
              {t("caseTracking.addCasePan", "Add Case Pan")}
            </Button>
            <Button variant="outline" onClick={() => setIsLinkProductModalOpen(true)}>
              <LinkIcon className="h-4 w-4 mr-2" />
              {t("caseTracking.linkProduct", "Link Product")}
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">{t("caseTracking.searchProduct", "Search Product")}</span>
              <Input
                placeholder={t("caseTracking.search", "Search...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">{t("caseTracking.show", "Show")}</span>
              <Select value={showEntries} onValueChange={setShowEntries}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm">{t("caseTracking.entries", "entries")}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <Checkbox
                    checked={selectedItems.length === displayedCasePans.length && displayedCasePans.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t("caseTracking.casePanNames", "Case Pan Names")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t("caseTracking.code", "Code")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t("caseTracking.quantity", "Quantity")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t("caseTracking.color", "Color")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t("caseTracking.linkedCategoryProducts", "Linked Category / Products")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t("caseTracking.availableCodes", "Available Codes")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {t("caseTracking.status", "Status")}
                </th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {t("caseTracking.loading", "Loading...")}
                  </td>
                </tr>
              ) : displayedCasePans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {t("caseTracking.noCasePans", "No case pans found")}
                  </td>
                </tr>
              ) : (
                displayedCasePans.map((casePan, index) => (
                  <tr
                    key={casePan.id}
                    className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedItems.includes(casePan.id)}
                        onCheckedChange={() => handleToggleSelect(casePan.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{casePan.name}</span>
                        {casePan.isRushGroup && (
                          <Zap className="h-4 w-4 text-yellow-600 fill-yellow-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono">
                        {casePan.code}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{casePan.quantity || 0}</td>
                    <td className="px-4 py-3">
                      {enableColorCoding && casePan.color_code && (
                        <div
                          className="w-12 h-8 rounded border"
                          style={{ backgroundColor: casePan.color_code }}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {casePan.connected_items && casePan.connected_items.length > 0 ? (
                          <>
                            {casePan.connected_items.slice(0, 2).map((item, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {item.length > 15 ? `${item.substring(0, 15)}...` : item}
                              </Badge>
                            ))}
                            {casePan.connected_items.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{casePan.connected_items.length - 2}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">
                            {t("caseTracking.noLinkedItems", "No linked items")}
                          </span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => handleLinkProduct(casePan)}
                        >
                          <LinkIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {casePan.availableCodes?.overcapacity && (
                        <Badge className="bg-red-100 text-red-700 border-red-300 mb-1">
                          <span className="text-red-600">⚠</span> Overcapacity
                        </Badge>
                      )}
                      {getAvailabilityBar(
                        casePan.availableCodes?.used || 0,
                        casePan.availableCodes?.total || casePan.quantity || 0,
                        casePan.availableCodes?.overcapacity,
                        casePan.availableCodes?.full
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={casePan.status === "Active"}
                        className="data-[state=checked]:bg-[#1162a8]"
                        disabled
                      />
                      <span className="ml-2 text-sm">
                        {casePan.status === "Active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(casePan)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t("caseTracking.edit", "Edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(casePan)}>
                            <Copy className="h-4 w-4 mr-2" />
                            {t("caseTracking.duplicate", "Duplicate")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleHistory(casePan)}>
                            <Clock className="h-4 w-4 mr-2" />
                            {t("caseTracking.history", "History")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReprint(casePan)}>
                            <Printer className="h-4 w-4 mr-2" />
                            {t("caseTracking.reprint", "Reprint")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleRushGroup(casePan)}>
                            {casePan.isRushGroup ? (
                              <>
                                <Check className="h-4 w-4 mr-2 text-yellow-600" />
                                {t("caseTracking.currentRushGroup", "Current Rush Group")}
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                {t("caseTracking.setAsRushGroup", "Set as Rush Group")}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(casePan.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("caseTracking.delete", "Delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddCasePanTrackingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        mode="add"
      />
      <AddCasePanTrackingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedCasePan(null)
        }}
        editData={selectedCasePan}
        mode="edit"
      />
      <DuplicateCasePanModal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false)
          setSelectedCasePan(null)
        }}
        sourceData={selectedCasePan}
      />
      <LinkProductModal
        isOpen={isLinkProductModalOpen}
        onClose={() => {
          setIsLinkProductModalOpen(false)
          setSelectedCasePan(null)
        }}
        casePanId={selectedCasePan?.id}
        casePanName={selectedCasePan?.name}
      />
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false)
          setSelectedCasePan(null)
        }}
        casePanId={selectedCasePan?.id}
        casePanName={selectedCasePan?.name}
        prefix={selectedCasePan?.code}
      />
      <ReprintSlipsModal
        isOpen={isReprintModalOpen}
        onClose={() => {
          setIsReprintModalOpen(false)
          setSelectedCasePan(null)
        }}
        casePanId={selectedCasePan?.id}
        casePanName={selectedCasePan?.name}
        prefix={selectedCasePan?.code}
      />
      <ChangeRushGroupModal
        isOpen={isChangeRushModalOpen}
        onClose={() => {
          setIsChangeRushModalOpen(false)
          setSelectedCasePan(null)
        }}
        casePanId={selectedCasePan?.id}
        casePanName={selectedCasePan?.name}
        prefix={selectedCasePan?.code}
        onConfirm={async () => {
          const customerId = getCustomerId()
          if (customerId && selectedCasePan) {
            await toggleRushGroup(selectedCasePan.id, customerId)
          }
        }}
      />
    </div>
  )
}
