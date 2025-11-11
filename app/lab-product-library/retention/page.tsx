"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, ChevronUp, ChevronDown, Edit, TrashIcon, Copy, Plus, Package } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreateRetentionModal } from "@/components/product-management/create-retention-modal"
import { DeleteRetentionModal } from "@/components/product-management/delete-retention-modal"
import { useRetention } from "@/contexts/product-retention-context"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { useTranslation } from "react-i18next"

type SortField = "name" | "code" | "status" | "price"
type SortDirection = "asc" | "desc"

export default function RetentionPage() {
  const { isLoading, retentions, loading, pagination, fetchRetentions, deleteRetention } = useRetention()
  const [selectedRetentions, setSelectedRetentions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [editRetention, setEditRetention] = useState<any | null>(null)
  const [deleteRetentionId, setDeleteRetentionId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { currentLanguage } = useLanguage()
  const { user } = useAuth()
  const { t } = useTranslation()

  const isLabAdmin = user?.role === "lab_admin"

  useEffect(() => {
    fetchRetentions()
  }, [currentLanguage])

  useEffect(() => {
    fetchRetentions(currentPage, Number(entriesPerPage), searchTerm)
  }, [fetchRetentions, currentPage, entriesPerPage, searchTerm, sortField, sortDirection, currentLanguage])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    fetchRetentions(currentPage, Number(entriesPerPage), searchTerm)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRetentions(retentions.map((r) => r.id.toString()))
    } else {
      setSelectedRetentions([])
    }
  }

  const handleSelectRetention = (retentionId: string, checked: boolean) => {
    if (checked) {
      setSelectedRetentions([...selectedRetentions, retentionId])
    } else {
      setSelectedRetentions(selectedRetentions.filter((id) => id !== retentionId))
    }
  }

  const isAllSelected = retentions.length > 0 && selectedRetentions.length === retentions.length
  const isIndeterminate = selectedRetentions.length > 0 && selectedRetentions.length < retentions.length

  const handleEntriesPerPageChange = (newEntriesPerPage: string) => {
    setEntriesPerPage(newEntriesPerPage)
    setCurrentPage(1)
  }

  if (loading && retentions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8]"></div>
      </div>
    )
  }

  function handleEdit(retention: any): void {
    setEditRetention(retention)
    setShowCreateModal(true)
  }

  function handleDelete(retentionId: number): void {
    setDeleteRetentionId(retentionId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (deleteRetentionId != null) {
      await deleteRetention(deleteRetentionId)
      setShowDeleteModal(false)
      setDeleteRetentionId(null)
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
            <h1 className="text-xl font-semibold text-gray-900">{t("Retention Management")}</h1>
            <p className="text-sm text-gray-500">{t("Manage your retention inventory and configurations")}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
          <Select value={entriesPerPage} onValueChange={handleEntriesPerPageChange}>
            <SelectTrigger className="w-20 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-700">{t("entries")}</span>
          
          {selectedRetentions.length > 0 && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedRetentions.length} {t("selected")}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {t("Delete Selected")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("Add Retention Type")}
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("Search Retention")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50">
              <TableHead className="w-12 pl-6">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  className={`border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] ${isIndeterminate ? "data-[state=checked]:bg-gray-400" : ""}`}
                />
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 font-semibold text-gray-900 hover:text-[#1162a8] transition-colors"
                >
                  {t("Retention Name")}
                  {getSortIcon("name")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("code")}
                  className="flex items-center gap-1 font-semibold text-gray-900 hover:text-[#1162a8] transition-colors"
                >
                  {t("Code")}
                  {getSortIcon("code")}
                </button>
              </TableHead>
              <TableHead>
                <span className="font-semibold text-gray-900">{t("Additional Price")}</span>
              </TableHead>
              {isLabAdmin && (
                <TableHead>
                  <button
                    onClick={() => handleSort("price")}
                    className="flex items-center gap-1 font-semibold text-gray-900 hover:text-[#1162a8] transition-colors"
                  >
                    {t("Price")}
                    {getSortIcon("price")}
                  </button>
                </TableHead>
              )}
              <TableHead>
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-1 font-semibold text-gray-900 hover:text-[#1162a8] transition-colors"
                >
                  {t("Status")}
                  {getSortIcon("status")}
                </button>
              </TableHead>
              <TableHead className="font-semibold text-gray-900 text-center pr-6">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retentions.length > 0 ? (
              retentions.map((retention, index) => (
                <TableRow
                  key={retention.id}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  <TableCell className="pl-6">
                    <Checkbox
                      checked={selectedRetentions.includes(retention.id.toString())}
                      onCheckedChange={(checked) => handleSelectRetention(retention.id.toString(), checked as boolean)}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">{retention.name}</TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">
                      {retention.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    {retention.lab_retention?.price
                      ? `$${parseFloat(retention.lab_retention.price).toFixed(2)}`
                      : "---"}
                  </TableCell>
                  {isLabAdmin && (
                    <TableCell>
                      <span className="font-medium text-gray-900">
                        ${(retention.price || 0).toFixed(2)}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        retention.status === "Active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {retention.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center pr-6">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(retention)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(retention.id)}
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
                <TableCell colSpan={isLabAdmin ? 7 : 6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900 mb-1">{t("No retentions found")}</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {searchTerm 
                          ? t("Try adjusting your search terms or filters")
                          : t("Get started by creating your first retention type")
                        }
                      </p>
                      {!searchTerm && (
                        <Button
                          className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                          onClick={() => setShowCreateModal(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("Add Your First Retention")}
                        </Button>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {retentions.length > 0 && (
          <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {t("Showing")} {Math.min(pagination.total, 1 + (currentPage - 1) * pagination.per_page)} {t("to")}{" "}
              {Math.min(pagination.total, currentPage * pagination.per_page)} {t("of")} {pagination.total} {t("entries")}
            </div>
            <div className="flex items-center space-x-1">
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                «
              </button>
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                let pageNum = i + 1
                if (pagination.last_page > 5) {
                  if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= pagination.last_page - 2) {
                    pageNum = pagination.last_page - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                }

                return (
                  <button
                    key={pageNum}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                      pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.last_page}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateRetentionModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditRetention(null)
        }}
        retention={editRetention}
      />
      <DeleteRetentionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
