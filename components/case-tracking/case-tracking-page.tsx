"use client"

import { useState, useEffect } from "react"
import { Plus, Link as LinkIcon, Clock, Printer, Copy, MoreVertical, Zap, Edit, Trash2, Check } from "lucide-react"
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
import { AddCasePanTrackingModal } from "./add-case-pan-tracking-modal"
import { DuplicateCasePanModal } from "./duplicate-case-pan-modal"
import { LinkProductModal } from "./link-product-modal"
import { HistoryModal } from "./history-modal"
import { ReprintSlipsModal } from "./reprint-slips-modal"
import { ChangeRushGroupModal } from "./change-rush-group-modal"

export function CaseTrackingPage() {
  const { t } = useTranslation()
  const { casePans, fetchCasePans, deleteCasePan } = useCaseTracking()

  const [searchQuery, setSearchQuery] = useState("")
  const [showEntries, setShowEntries] = useState("20")
  const [enableColorCoding, setEnableColorCoding] = useState(true)
  const [currentRushGroup, setCurrentRushGroup] = useState<string>("Special Cases - Y")

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

  // Mock data - replace with actual data from context
  const mockCasePans = [
    {
      id: 1,
      name: "Regular cases",
      code: "R",
      quantity: 200,
      color: "#1162A8",
      linkedCategories: ["Removable R...", "Night G..."],
      linkedProducts: ["+18"],
      availableCodes: { used: 120, total: 200 },
      status: "Active",
      isRushGroup: false,
    },
    {
      id: 2,
      name: "Other cases",
      code: "H",
      quantity: 200,
      color: "#11A85D",
      linkedCategories: ["Add tooth to ...", "Hard rel..."],
      linkedProducts: ["+18"],
      availableCodes: { used: 226, total: 200, overcapacity: true },
      status: "Active",
      isRushGroup: false,
    },
    {
      id: 3,
      name: "Appointments",
      code: "z",
      quantity: 200,
      color: "#A81180",
      linkedCategories: ["Space main...", "Expan..."],
      linkedProducts: ["+18"],
      availableCodes: { used: 140, total: 200 },
      status: "Active",
      isRushGroup: false,
    },
    {
      id: 4,
      name: "Special Cases",
      code: "y",
      quantity: 200,
      color: "#8B0000",
      linkedCategories: ["Single Crowns", "Bridges"],
      linkedProducts: ["+18"],
      availableCodes: { used: 120, total: 200 },
      status: "Active",
      isRushGroup: true,
      rushIcon: true,
    },
    {
      id: 5,
      name: "3D dentures",
      code: "N",
      quantity: 200,
      color: "#E0E0E0",
      linkedCategories: ["Removable R...", "Ortho"],
      linkedProducts: ["+18"],
      availableCodes: { used: 200, total: 200, full: true },
      status: "Inactive",
      isRushGroup: false,
    },
  ]

  useEffect(() => {
    fetchCasePans()
  }, [])

  const handleToggleSelect = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedItems.length === mockCasePans.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(mockCasePans.map((cp) => cp.id))
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

  const handleToggleRushGroup = (casePan: any) => {
    if (!casePan.isRushGroup) {
      setSelectedCasePan(casePan)
      setIsChangeRushModalOpen(true)
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
            <h1 className="text-xl font-semibold">{t("caseTracking.casePanTrackingSystem", "Case Pan Tracking System")}</h1>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">{t("caseTracking.enableColorCoding", "Enable Color Coding")}</span>
            <Switch
              checked={enableColorCoding}
              onCheckedChange={setEnableColorCoding}
              className="data-[state=checked]:bg-[#1162a8]"
            />
          </div>
        </div>

        {/* Current Rush Group Banner */}
        <div className="px-6 py-3 bg-yellow-50 border-b flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-600 fill-yellow-600" />
          <span className="text-sm font-medium text-yellow-800">
            {t("caseTracking.currentRushGroup", "Current Rush Group")}: {currentRushGroup}
          </span>
        </div>

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
                    checked={selectedItems.length === mockCasePans.length}
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
              {mockCasePans.map((casePan, index) => (
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
                  <td className="px-4 py-3">{casePan.quantity}</td>
                  <td className="px-4 py-3">
                    {enableColorCoding && (
                      <div
                        className="w-12 h-8 rounded border"
                        style={{ backgroundColor: casePan.color }}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {casePan.linkedCategories.map((cat, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {casePan.linkedProducts.map((prod, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {prod}
                        </Badge>
                      ))}
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <LinkIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {casePan.availableCodes.overcapacity && (
                      <Badge className="bg-red-100 text-red-700 border-red-300 mb-1">
                        <span className="text-red-600">⚠</span> Overcapacity
                      </Badge>
                    )}
                    {getAvailabilityBar(
                      casePan.availableCodes.used,
                      casePan.availableCodes.total,
                      casePan.availableCodes.overcapacity,
                      casePan.availableCodes.full
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={casePan.status === "Active"}
                      className="data-[state=checked]:bg-[#1162a8]"
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
              ))}
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
        onConfirm={() => {
          setCurrentRushGroup(`${selectedCasePan?.name} - ${selectedCasePan?.code}`)
        }}
      />
    </div>
  )
}
