"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Info, Edit, TrashIcon, Copy, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CreateToothStatusModal } from "@/components/product-management/create-tooth-status-modal"
import { CreateToothStatusGroupModal } from "@/components/product-management/create-tooth-status-group-modal"
import { DiscardChangesDialog } from "@/components/product-management/discard-changes-dialog"
import { useLanguage } from "@/contexts/language-context"

interface ToothStatus {
  id: number
  name: string
  color: string
  initial_loading: boolean
  active: boolean
  description?: string
}

interface ToothStatusGroup {
  id: number
  name: string
  tooth_statuses: ToothStatus[]
}

type SortDirection = "asc" | "desc" | null

type SortState = {
  column: keyof ToothStatus | null
  direction: SortDirection
}

export default function ToothMappingPage() {
  const [toothStatuses, setToothStatuses] = useState<ToothStatus[]>([
    {
      id: 1,
      name: "Teeth in mouth",
      color: "#F5E6D3",
      initial_loading: true,
      active: true,
      description: "Teeth that are present in the mouth"
    },
    {
      id: 2,
      name: "Missing teeth",
      color: "#D3D3D3",
      initial_loading: false,
      active: true,
      description: "Teeth that are missing from the mouth"
    },
    {
      id: 3,
      name: "Will extract on delivery",
      color: "#FF6B6B",
      initial_loading: false,
      active: true,
      description: "Teeth that will be extracted upon delivery"
    },
    {
      id: 4,
      name: "Has been extracted",
      color: "#808080",
      initial_loading: false,
      active: true,
      description: "Teeth that have already been extracted"
    },
    {
      id: 5,
      name: "Fix/Repair",
      color: "#90EE90",
      initial_loading: false,
      active: true,
      description: "Teeth that need fixing or repair"
    },
    {
      id: 6,
      name: "Clasps",
      color: "#FFB6C1",
      initial_loading: false,
      active: true,
      description: "Teeth with clasps"
    },
    {
      id: 7,
      name: "Prepped",
      color: "#D2B48C",
      initial_loading: false,
      active: true,
      description: "Teeth that have been prepared"
    },
    {
      id: 8,
      name: "Implant",
      color: "#ADD8E6",
      initial_loading: true,
      active: true,
      description: "Teeth with implants"
    }
  ])

  const [toothStatusGroups, setToothStatusGroups] = useState<ToothStatusGroup[]>([
    {
      id: 1,
      name: "Fixed Restoration only",
      tooth_statuses: []
    },
    {
      id: 2,
      name: "Repairs only",
      tooth_statuses: []
    },
    {
      id: 3,
      name: "Removables",
      tooth_statuses: []
    },
    {
      id: 4,
      name: "3D dentures",
      tooth_statuses: []
    }
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<keyof ToothStatus | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [entriesPerPage, setEntriesPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isCreateToothStatusModalOpen, setIsCreateToothStatusModalOpen] = useState(false)
  const [isCreateToothStatusGroupModalOpen, setIsCreateToothStatusGroupModalOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [editingToothStatus, setEditingToothStatus] = useState<ToothStatus | null>(null)
  const { currentLanguage } = useLanguage()

  const filteredToothStatuses = toothStatuses.filter(
    (status) =>
      status.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSort = (column: keyof ToothStatus) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const renderSortIndicator = (column: keyof ToothStatus) => {
    if (sortColumn !== column) return null

    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(toothStatuses.map((status) => status.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId])
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId))
    }
  }

  const handleOpenCreateToothStatusModal = () => {
    setEditingToothStatus(null)
    setIsCreateToothStatusModalOpen(true)
  }

  const handleOpenCreateToothStatusGroupModal = () => {
    setIsCreateToothStatusGroupModalOpen(true)
  }


  function handleEdit(toothStatus: ToothStatus): void {
    setEditingToothStatus(toothStatus)
    setIsCreateToothStatusModalOpen(true)
  }

  async function handleDelete(id: number): Promise<void> {
    setToothStatuses(prev => prev.filter(status => status.id !== id))
  }

  async function handleBulkDelete(): Promise<void> {
    if (selectedItems.length > 0) {
      setToothStatuses(prev => prev.filter(status => !selectedItems.includes(status.id)))
      setSelectedItems([])
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Tooth Mapping Management</h1>
            <p className="text-sm text-gray-500">Manage tooth statuses and groups for your products</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              const newEntriesPerPage = Number(e.target.value)
              setEntriesPerPage(newEntriesPerPage)
              setCurrentPage(1)
            }}
            className="w-20 h-9 text-sm border border-gray-300 rounded-md px-2 focus:border-[#1162a8] focus:ring-[#1162a8]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700">entries</span>
          
          {selectedItems.length > 0 && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleBulkDelete}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={handleOpenCreateToothStatusModal}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tooth Status
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search tooth statuses..."
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table Section with Split View */}
      <div className="flex">
        {/* Left side - Tooth Statuses */}
        <div className="flex-grow border-r border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={selectedItems.length === toothStatuses.length && toothStatuses.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      Tooth Status
                      {sortColumn === "name" && renderSortIndicator("name")}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">Color</TableHead>
                  <TableHead className="font-semibold text-gray-900">Initial Loading</TableHead>
                  <TableHead className="font-semibold text-gray-900">Active</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8]"></div>
                        <span className="text-gray-500 text-sm">Loading tooth statuses...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredToothStatuses.length > 0 ? (
                  filteredToothStatuses.map((status) => (
                    <TableRow key={status.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedItems.includes(status.id)}
                          onCheckedChange={(checked) => handleSelectItem(status.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{status.name}</TableCell>
                      <TableCell>
                        <div 
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: status.color }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className={`w-12 h-6 rounded-full relative transition-colors ${
                          status.initial_loading ? 'bg-[#1162a8]' : 'bg-gray-300'
                        }`}>
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            status.initial_loading ? 'translate-x-6' : 'translate-x-0'
                          }`} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`w-12 h-6 rounded-full relative transition-colors ${
                          status.active ? 'bg-[#1162a8]' : 'bg-gray-300'
                        }`}>
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            status.active ? 'translate-x-6' : 'translate-x-0'
                          }`} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(status)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(status.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium text-gray-900 mb-1">No tooth statuses found</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {searchQuery 
                              ? "Try adjusting your search terms or filters"
                              : "Get started by creating your first tooth status"
                            }
                          </p>
                          {!searchQuery && (
                            <Button
                              className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                              onClick={handleOpenCreateToothStatusModal}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Your First Tooth Status
                            </Button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <CreateToothStatusModal
        isOpen={isCreateToothStatusModalOpen}
        onClose={() => {
          setIsCreateToothStatusModalOpen(false)
          setEditingToothStatus(null)
        }}
        onChanges={(hasChanges) => setHasUnsavedChanges(hasChanges)}
        toothStatus={editingToothStatus}
        mode={editingToothStatus ? "edit" : "create"}
      />

      <CreateToothStatusGroupModal
        isOpen={isCreateToothStatusGroupModalOpen}
        onClose={() => {
          setIsCreateToothStatusGroupModalOpen(false)
        }}
        onChanges={(hasChanges) => setHasUnsavedChanges(hasChanges)}
      />
    </div>
  )
}
