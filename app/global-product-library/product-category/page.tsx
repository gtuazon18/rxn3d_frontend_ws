"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Copy, Edit, TrashIcon, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddCategoryModal } from "@/components/product-management/add-category-modal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { useProductCategory } from "@/contexts/product-category-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"

export default function ProductCategoryPage() {
  const {
    categories,
    pagination,
    isLoading,
    error, 
    searchQuery,
    sortColumn,
    sortDirection,
    selectedItems,
    fetchCategories,
    setSearchQuery,
    setSortColumn,
    setSortDirection,
    setSelectedItems,
    deleteCategory,
    bulkDeleteCategories,
  } = useProductCategory()

  const [entriesPerPage, setEntriesPerPage] = useState(pagination.per_page.toString() || "25")
  const [currentPage, setCurrentPage] = useState(pagination.current_page || 1)
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [deleteIsCustomNo, setDeleteIsCustomNo] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();
  
  useEffect(() => {
    fetchCategories(currentPage, Number(entriesPerPage), searchQuery, sortColumn, sortDirection)
  }, [currentPage, entriesPerPage, searchQuery, sortColumn, sortDirection, fetchCategories, currentLanguage])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput)
        setCurrentPage(1) 
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput, searchQuery, setSearchQuery])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(value)
    setCurrentPage(1)
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") setSortDirection("desc")
      else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
      } else setSortDirection("asc")
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const renderSortIndicator = (columnKey: string) => {
    if (sortColumn !== columnKey) return null
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(categories.map((category) => category.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    }
  }

  const getStatusBadgeClass = (status: string) => {
    return status === "Active"
      ? "bg-green-100 text-green-800 border border-green-200"
      : "bg-gray-100 text-gray-800 border border-gray-200"
  }

  const getTypeBadgeClass = (type: string) => {
    const typeMap: Record<string, string> = {
      Upper: "bg-blue-100 text-blue-800 border border-blue-200",
      Lower: "bg-purple-100 text-purple-800 border border-purple-200",
      Both: "bg-green-100 text-green-800 border border-green-200",
    }
    return typeMap[type] || "bg-gray-100 text-gray-800 border border-gray-200"
  }

  const totalPages = pagination.last_page || 1
  const startEntry =
    pagination.total > 0 ? Math.min(pagination.total, (currentPage - 1) * Number(entriesPerPage) + 1) : 0
  const endEntry = pagination.total > 0 ? Math.min(pagination.total, currentPage * Number(entriesPerPage)) : 0

  const handleModalClose = () => {
    setIsAddCategoryModalOpen(false)
    fetchCategories(currentPage, Number(entriesPerPage), searchQuery, sortColumn, sortDirection)
  }

  const getColorBadge = (color: string) => {
    const colorMap: Record<string, string> = {
      "#1162a8": "bg-[#1162a8] text-white",
      "#cf0202": "bg-[#cf0202] text-white",
      "#ffffff": "bg-[#ffffff] text-black border border-[#000000]",
      "#11a85d": "bg-[#11a85d] text-white",
      "#a81180": "bg-[#a81180] text-white",
      "#f6be2c": "bg-[#f6be2c] text-black",
      "#119ba8": "bg-[#119ba8] text-white",
    }

    return colorMap[color.toLowerCase()] || "bg-gray-300 text-black border border-gray-400"
  }

  function handleEdit(id: number): void {
    const categoryToEdit = categories.find((cat) => cat.id === id)
    if (categoryToEdit) {
      setIsAddCategoryModalOpen(true)
    }
  }

  function handleDelete(id: number): void {
    const categoryToDelete = categories.find((cat) => cat.id === id)
    setDeleteTargetId(id)
    setDeleteIsCustomNo(categoryToDelete && categoryToDelete.is_custom === false)
    setDeleteModalOpen(true)
  }

  async function confirmDelete() {
    if (deleteTargetId == null) return
    setDeleteLoading(true)
    await deleteCategory(deleteTargetId, true)
    setDeleteLoading(false)
    setDeleteModalOpen(false)
    setDeleteTargetId(null)
  }

  function handleBulkDelete() {
    setBulkDeleteModalOpen(true)
  }

  async function confirmBulkDelete() {
    setDeleteLoading(true)
    await bulkDeleteCategories(selectedItems)
    setDeleteLoading(false)
    setBulkDeleteModalOpen(false)
  }

  function handleCopy(text: string): void {
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch((err) => {
        console.error("Failed to copy text: ", err)
      })
    } else {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand("copy")
      } catch (err) {
        console.error("Fallback: Oops, unable to copy", err)
      }
      document.body.removeChild(textarea)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Product Category Management</h1>
            <p className="text-sm text-gray-500">Manage product categories and classifications</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t("Show", { defaultValue: "Show" })}</span>
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
          <span className="text-sm text-gray-700">{t("entries", { defaultValue: "entries" })}</span>

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
          <Button className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            {t("Import from category library", { defaultValue: "Import from category library" })}
          </Button>
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsAddCategoryModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("Add Category", { defaultValue: "Add Category" })}
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t("Search Categories", { defaultValue: "Search Categories" })}
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50">
              <TableHead className="w-12 pl-6">
                <Checkbox
                  checked={selectedItems.length === categories.length && categories.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                  aria-label={t("Select all categories", { defaultValue: "Select all categories" })}
                />
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">
                {t("Case Pan", { defaultValue: "Case Pan" })}
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                {t("productCategory", { defaultValue: "Category" })} {renderSortIndicator("name")}
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">
                {t("Sub Category", { defaultValue: "Sub Category" })}
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">
                {t("Default Code", { defaultValue: "Default Code" })}
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">
                {t("Arch Type", { defaultValue: "Arch Type" })}
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">
                {t("Visibility", { defaultValue: "Visibility" })}
              </TableHead>
              <TableHead className="cursor-pointer font-semibold text-gray-900">
                {t("Action", { defaultValue: "Action" })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Number.parseInt(entriesPerPage) }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell className="pl-6">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-8 h-6 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <TableRow key={category.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <TableCell className="pl-6">
                    <Checkbox
                      checked={selectedItems.includes(category.id)}
                      onCheckedChange={(checked) => handleSelectItem(category.id, !!checked)}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                      aria-labelledby={`category-name-${category.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-8 h-6 rounded flex items-center justify-center text-xs font-medium border ${getColorBadge(category?.color_code)}`}
                      >
                        ---
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900" id={`category-name-${category.id}`}>
                    {category.name}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {category?.sub_name}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {category.code}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {category.type}
                  </TableCell>
                  <TableCell className="font-medium text-gray-700">
                    {t("All Labs", { defaultValue: "All Labs" })}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(category.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50 ${category.is_custom === false ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => category.is_custom !== false && handleDelete(category.id)}
                        disabled={category.is_custom === false}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                        onClick={() => handleCopy(category.sequence.toString())}
                        aria-label={t("Copy days", { defaultValue: "Copy days" })}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900 mb-1">No categories found</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Try adjusting your search or add a new category
                      </p>
                      <Button
                        className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                        onClick={() => setIsAddCategoryModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Category
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {t("Showing", { defaultValue: "Showing" })} {startEntry} {t("to", { defaultValue: "to" })} {endEntry} {t("of", { defaultValue: "of" })} {pagination.total} {t("entries", { defaultValue: "entries" })}
        </div>
        <div className="flex items-center space-x-1">
          <button
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={t("Previous page", { defaultValue: "Previous page" })}
          >
            «
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1
            if (totalPages > 5) {
              if (currentPage <= 3) pageNum = i + 1
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
              else pageNum = currentPage - 2 + i
            }
            if (pageNum <= 0 || pageNum > totalPages) return null

            return (
              <button
                key={pageNum}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                  pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
                onClick={() => handlePageChange(pageNum)}
                aria-label={t("Go to page", { defaultValue: "Go to page" }) + ` ${pageNum}`}
                aria-current={pageNum === currentPage ? "page" : undefined}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            aria-label={t("Next page", { defaultValue: "Next page" })}
          >
            »
          </button>
        </div>
      </div>

      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={handleModalClose}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName="category"
        isLoading={deleteLoading}
        isCustomNo={deleteIsCustomNo}
      />

      <DeleteConfirmationModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        onConfirm={confirmBulkDelete}
        itemCount={selectedItems.length}
        isLoading={deleteLoading}
      />
    </div>
  )
}
