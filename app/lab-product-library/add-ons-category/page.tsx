"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Info, Edit, Trash2, Copy, TrashIcon, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddAddOnCategoryModal } from "@/components/product-management/add-add-on-category-modal"
import { useAddOns } from "@/contexts/product-add-on-category-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"

export default function AddOnsCategoryPage() {
  const {
    addOns,
    isLoadingAddOns,
    addOnError,
    addOnPagination,
    searchQuery,
    setSearchQuery,
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
    selectedItems,
    setSelectedItems,
    fetchAddOns,
    deleteAddOn,
    addOnCategoriesForSelect,
    fetchAddOnCategoriesForSelect,
    isLoadingCategoriesForSelect,
  } = useAddOns()

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingAddOn, setEditingAddOn] = useState<any>(null)
  const [isCopying, setIsCopying] = useState(false)

  // Discard dialog states
  const [hasModalChanges, setHasModalChanges] = useState(false)

  // Pagination states
  const [entriesPerPage, setEntriesPerPage] = useState(addOnPagination?.per_page?.toString() || "10")
  const [currentPage, setCurrentPage] = useState(addOnPagination?.current_page || 1)

  // Category selection state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const [searchInput, setSearchInput] = useState(searchQuery)
  const { currentLanguage } = useLanguage()
  const { t } = useTranslation()

  // Fetch all categories for the vertical tabs
  useEffect(() => {
    fetchAddOnCategoriesForSelect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage])

  // Fetch add-ons when language changes
  useEffect(() => {
    fetchAddOns(currentPage, Number(entriesPerPage), searchQuery, sortColumn, sortDirection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage])

  // Keep local pagination state in sync with context pagination
  useEffect(() => {
    if (addOnPagination) {
      if (addOnPagination.per_page.toString() !== entriesPerPage) {
        setEntriesPerPage(addOnPagination.per_page.toString())
      }
      if (addOnPagination.current_page !== currentPage) {
        setCurrentPage(addOnPagination.current_page)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOnPagination])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput)
        setCurrentPage(1)
      }
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // Keep search input in sync with context searchQuery
  useEffect(() => {
    if (searchQuery !== searchInput) {
      setSearchInput(searchQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Fetch add-ons when pagination, search, or sort changes
  useEffect(() => {
    fetchAddOns(currentPage, Number(entriesPerPage), searchQuery, sortColumn, sortDirection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, entriesPerPage, searchQuery, sortColumn, sortDirection, currentLanguage])

  const handlePageChange = (page: number) => {
    if (addOnPagination && page >= 1 && page <= addOnPagination.last_page) {
      setCurrentPage(page)
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection("asc")
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return null

    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      if (selectedCategoryId) {
        // Select all subcategories
        setSelectedItems(displayData.map((item: any) => item.id))
      } else {
        // Select all categories
        setSelectedItems(displayData.map((addOn: any) => addOn.id))
      }
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

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId)
    setSelectedItems([]) // Clear selection when switching categories
    setCurrentPage(1) // Reset to first page
  }

  // Get the data to display in the table
  const displayData = selectedCategoryId
    ? (() => {
        const selectedCategory = addOns.find((cat: any) => cat.id === selectedCategoryId)
        return selectedCategory?.subcategories || []
      })()
    : addOns

  // Get the loading state
  const isTableLoading = isLoadingAddOns

  const handleEdit = (addOn: any) => {
    setEditingAddOn(addOn)
    setIsCopying(false)
    setIsEditModalOpen(true)
  }

  const handleCopy = (addOn: any) => {
    setEditingAddOn(addOn)
    setIsCopying(true)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await deleteAddOn(id)
  }

  const renderLoadingSkeleton = () => (
    <>
      {[...Array(Number(entriesPerPage))].map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell className="px-2">
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-48" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("Add-ons Category Management")}</h1>
            <p className="text-sm text-gray-500">{t("Manage your global add-on inventory and configurations")}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
          <Select
            value={entriesPerPage}
            onValueChange={(value) => {
              setEntriesPerPage(value)
              setCurrentPage(1)
            }}
          >
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

          {selectedItems.length > 0 && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.length} {t("selected")}
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
          <Button className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            Import add-ons category
          </Button>
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add add-ons Category
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t("Search add-ons...")}
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {addOnError && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{addOnError}</p>
        </div>
      )}

      {/* Main Content with Vertical Tabs */}
      <div className="flex flex-row">
        {/* Vertical Tabs for Categories */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">{t("Categories", "Categories")}</h2>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            {isLoadingCategoriesForSelect ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1162a8] mx-auto"></div>
                <p className="text-xs text-gray-500 mt-2">{t("Loading categories...", "Loading categories...")}</p>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleCategorySelect(null)}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors border-b border-gray-200 ${
                    selectedCategoryId === null
                      ? "bg-[#1162a8] text-white border-l-4 border-l-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {t("All Categories", "All Categories")}
                </button>
                {addOnCategoriesForSelect.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors border-b border-gray-200 ${
                      selectedCategoryId === category.id
                        ? "bg-[#1162a8] text-white border-l-4 border-l-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 overflow-x-auto">
        <Table className="w-full table-auto">
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50">
              <TableHead className="w-12 px-2">
                <Checkbox
                  checked={selectedItems.length === displayData.length && displayData.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                />
              </TableHead>
              <TableHead className="font-semibold text-gray-900 px-2 text-left min-w-[100px] whitespace-nowrap">{t("Category Code")}</TableHead>
              <TableHead className="font-semibold text-gray-900 px-2 text-left min-w-[150px]">{t("Add-on Sub Category")}</TableHead>
              <TableHead className="font-semibold text-gray-900 px-2 text-left min-w-[120px] whitespace-nowrap">{t("Sub Category Code")}</TableHead>
              <TableHead className="font-semibold text-gray-900 text-left w-24 px-2 whitespace-nowrap">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isTableLoading ? (
              renderLoadingSkeleton()
            ) : selectedCategoryId ? (
              // Show subcategories of selected category
              displayData.length > 0 ? (
                displayData.map((subcat: any) => {
                  const parentCategory = addOns.find((cat: any) => cat.id === selectedCategoryId)
                  return (
                    <TableRow key={`sub-${subcat.id}`} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="px-2">
                        <Checkbox
                          checked={selectedItems.includes(subcat.id)}
                          onCheckedChange={(checked) => handleSelectItem(subcat.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="text-gray-600 px-2 whitespace-nowrap">{parentCategory?.code ? parentCategory.code : "--"}</TableCell>
                      <TableCell className="font-medium text-gray-900 px-2">
                        <span className="break-words" title={subcat.name || "--"}>
                          {subcat.name ? subcat.name : "--"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600 px-2 whitespace-nowrap">{subcat.code ? subcat.code : "--"}</TableCell>
                      <TableCell className="text-left px-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(parentCategory)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => parentCategory?.id && handleDelete(parentCategory.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-medium text-gray-900 mb-1">{t("No sub-categories found", "No sub-categories found")}</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {t("This category has no sub-categories yet", "This category has no sub-categories yet")}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )
            ) : displayData.length > 0 ? (
              // Show all categories with subcategories
              displayData.map((category: any) =>
                category.subcategories && category.subcategories.length > 0 ? (
                  category.subcategories.map((subcat: any, idx: number) => (
                    <TableRow key={`cat-${category.id}-sub-${subcat.id}`} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      {idx === 0 ? (
                        <>
                          <TableCell
                            className="px-2 align-middle"
                            rowSpan={category.subcategories.length}
                            style={{ verticalAlign: "middle" }}
                          >
                            <div className="h-full flex flex-col justify-center">
                              <Checkbox
                                checked={selectedItems.includes(category.id)}
                                onCheckedChange={(checked) => handleSelectItem(category.id, !!checked)}
                                className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                              />
                            </div>
                          </TableCell>
                          <TableCell
                            rowSpan={category.subcategories.length}
                            className="text-gray-600 align-middle px-2 whitespace-nowrap"
                            style={{ verticalAlign: "middle" }}
                          >
                            <div className="h-full flex flex-col justify-center">
                              {category.code ? category.code : "--"}
                            </div>
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell className="font-medium text-gray-900 px-2">
                        <span className="break-words" title={subcat.name || "--"}>
                          {subcat.name ? subcat.name : "--"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600 px-2 whitespace-nowrap">{subcat.code ? subcat.code : "--"}</TableCell>
                      <TableCell className="text-left px-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(category.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow key={`cat-${category.id}`} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="px-2">
                      <Checkbox
                        checked={selectedItems.includes(category.id)}
                        onCheckedChange={(checked) => handleSelectItem(category.id, !!checked)}
                        className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                      />
                    </TableCell>
                    <TableCell className="text-gray-600 px-2 whitespace-nowrap">{category.code ? category.code : "--"}</TableCell>
                    <TableCell className="px-2">{/* subcategory name */}--</TableCell>
                    <TableCell className="px-2 whitespace-nowrap">{/* subcategory code */}--</TableCell>
                    <TableCell className="text-left px-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(category.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {selectedCategoryId 
                          ? t("No sub-categories found", "No sub-categories found")
                          : t("No add-ons found", "No add-ons found")
                        }
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {searchQuery 
                          ? t("Try adjusting your search terms or filters")
                          : selectedCategoryId
                          ? t("This category has no sub-categories yet", "This category has no sub-categories yet")
                          : t("Get started by creating your first add-on")
                        }
                      </p>
                      {!searchQuery && !selectedCategoryId && (
                        <Button
                          className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                          onClick={() => setIsCreateModalOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("Add Your First Add-on", "Add Your First Add-on")}
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

      {/* Pagination - Only show when viewing all categories, not subcategories */}
      {!selectedCategoryId && addOnPagination && addOnPagination.total > 0 && (
        <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {t("Showing")} {Math.min(addOnPagination?.total ?? 0, 1 + (currentPage - 1) * (addOnPagination?.per_page ?? 10))} {t("to")}{" "}
          {Math.min(addOnPagination?.total ?? 0, currentPage * (addOnPagination?.per_page ?? 10))} {t("of")} {addOnPagination?.total ?? 0} {t("entries")}
        </div>
        <div className="flex items-center space-x-1">
          <button
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoadingAddOns}
          >
            «
          </button>
          {Array.from({ length: Math.min(5, addOnPagination?.last_page ?? 1) }, (_, i) => {
            let pageNum = i + 1
            if ((addOnPagination?.last_page ?? 1) > 5) {
              if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= (addOnPagination?.last_page ?? 1) - 2) {
                pageNum = (addOnPagination?.last_page ?? 1) - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
            }

            return (
              <button
                key={pageNum}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                onClick={() => handlePageChange(pageNum)}
                disabled={isLoadingAddOns}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === (addOnPagination?.last_page ?? 1) || isLoadingAddOns}
          >
            »
          </button>
        </div>
        </div>
      )}

      {/* Show count for subcategories */}
      {selectedCategoryId && displayData.length > 0 && (
        <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {t("Showing")} {displayData.length} {t("sub-categories", "sub-categories")}
          </div>
        </div>
      )}

      {/* Create Add-on Modal */}
      <AddAddOnCategoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onHasChangesChange={setHasModalChanges}
      />

      {/* Edit Add-on Modal */}
      {editingAddOn && !isCopying && (
        <AddAddOnCategoryModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingAddOn(null)
            setIsCopying(false)
          }}
          onHasChangesChange={setHasModalChanges}
          addOn={editingAddOn}
          isEditing={true}
        />
      )}

      {/* Copy Add-on Modal */}
      {editingAddOn && isCopying && (
        <AddAddOnCategoryModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingAddOn(null)
            setIsCopying(false)
          }}
          onHasChangesChange={setHasModalChanges}
          addOn={editingAddOn}
          isEditing={false}
          isCopying={isCopying}
        />
      )}
    </div>
  )
}
