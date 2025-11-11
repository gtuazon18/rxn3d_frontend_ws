"use client"

import { useState, useEffect, useRef } from "react"
import { X, Search, Package, Square, Upload, Image as ImageIcon, Loader2, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useStages, type Stage } from "@/contexts/product-stages-context"
import { useTranslation } from "react-i18next"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { fetchProductsWithCache } from "@/services/product-modal-api"
import { linkStagesToProducts, buildLinkPayload } from "@/services/stage-product-link-api"
import { useToast } from "@/hooks/use-toast"
import { LoadingOverlay } from "@/components/ui/loading-overlay"

interface Product {
  id: number
  name: string
  category: string
  imageStatus: "none" | "some" | "all"
  isSelected: boolean
  stages?: any[]
}

interface LinkProductsModalProps {
  isOpen: boolean
  onClose: () => void
  context?: "global" | "lab" // Add context prop to differentiate between global and lab usage
  onApply?: (selectedStages: number[], selectedProducts: number[]) => void // Custom apply handler
  customProducts?: Product[] // Allow custom product data to be passed in
}

// Mock data removed - now using API data from fetchProductsWithCache

export function LinkProductsModal({ isOpen, onClose, context = "global", onApply, customProducts }: LinkProductsModalProps) {
  const { stages } = useStages()
  const { t } = useTranslation()
  const { toast } = useToast()

  const [selectedStages, setSelectedStages] = useState<number[]>([]) // Multiple stage selection
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"individual" | "category">("individual")
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // API state
  const [apiProducts, setApiProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Category selection state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Image upload state - stores images for each product-stage combination
  const [uploadedImages, setUploadedImages] = useState<Record<string, File>>({})
  // Image preview URLs for displaying thumbnails
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({})
  // Ref to track preview URLs for cleanup without causing re-renders
  const imagePreviewsRef = useRef<Record<string, string>>({})

  // Use custom products if provided, otherwise use API data
  const products = customProducts || apiProducts

  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      if (customProducts || !isOpen) return

      setIsLoadingProducts(true)
      setProductsError(null)

      try {
        // Get lab ID from localStorage
        const role = typeof window !== "undefined" ? localStorage.getItem("role") : null
        const labId = role === "office_admin" || role === "doctor"
          ? (typeof window !== "undefined" ? localStorage.getItem("selectedLabId") : null)
          : (typeof window !== "undefined" ? localStorage.getItem("customerId") : null)

        if (!labId) {
          throw new Error("Lab ID not found")
        }

        // Fetch products with pagination
        const response = await fetchProductsWithCache(Number(labId), {
          per_page: 25,
          page: 1,
        })

        // Transform API response to match Product interface
        const transformedProducts: Product[] = response.map((item: any) => {
          // Calculate image status based on stages
          let imageStatus: "none" | "some" | "all" = "none"
          if (item.stages && item.stages.length > 0) {
            // For now, set to "none" - you can implement logic to check actual image configuration
            imageStatus = "none"
          }

          return {
            id: item.id,
            name: item.name,
            category: item.subcategory_name || item.category_name || "Uncategorized",
            imageStatus,
            isSelected: false,
            stages: item.stages || []
          }
        })

        setApiProducts(transformedProducts)
      } catch (error: any) {
        console.error("Error fetching products:", error)
        setProductsError(error.message || "Failed to load products")
      } finally {
        setIsLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [isOpen, customProducts])

  // Initialize selected products with pre-selected items from the products data
  useEffect(() => {
    if (products.length > 0 && selectedProducts.length === 0) {
      const preSelected = products.filter(p => p.isSelected).map(p => p.id)
      setSelectedProducts(preSelected)
    }
  }, [products, selectedProducts.length])

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleStageSelect = (stageId: number, checked: boolean) => {
    if (checked) {
      setSelectedStages([...selectedStages, stageId])
    } else {
      setSelectedStages(selectedStages.filter(id => id !== stageId))
    }
    setHasChanges(true)
  }

  const handleProductSelect = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId])
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId))
    }
    setHasChanges(true)
  }

  const handleSelectAllStages = () => {
    if (selectedStages.length === stages.length) {
      setSelectedStages([])
    } else {
      setSelectedStages(stages.map(stage => stage.id))
    }
    setHasChanges(true)
  }

  const handleSelectAllProducts = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map(product => product.id))
    }
    setHasChanges(true)
  }

  const handleCategorySelect = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category])
      // Select all products in this category
      const categoryProducts = products.filter(p => p.category === category).map(p => p.id)
      const newSelection = Array.from(new Set([...selectedProducts, ...categoryProducts]))
      setSelectedProducts(newSelection)
    } else {
      setSelectedCategories(selectedCategories.filter(c => c !== category))
      // Deselect all products in this category
      const categoryProducts = products.filter(p => p.category === category).map(p => p.id)
      setSelectedProducts(selectedProducts.filter(id => !categoryProducts.includes(id)))
    }
    setHasChanges(true)
  }

  const handleSelectAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([])
      setSelectedProducts([])
    } else {
      setSelectedCategories([...categories])
      setSelectedProducts(products.map(p => p.id))
    }
    setHasChanges(true)
  }

  const handleImageUpload = (productId: number, stageId: number, file: File | null) => {
    const key = `${productId}-${stageId}`
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setUploadedImages(prev => ({
        ...prev,
        [key]: file
      }))
      setImagePreviews(prev => ({
        ...prev,
        [key]: previewUrl
      }))
      setHasChanges(true)
      toast({
        title: "Image Uploaded",
        description: `Image uploaded for ${file.name}`,
      })
    } else {
      // Remove image and cleanup preview URL
      setUploadedImages(prev => {
        const newImages = { ...prev }
        delete newImages[key]
        return newImages
      })
      setImagePreviews(prev => {
        const newPreviews = { ...prev }
        if (newPreviews[key]) {
          URL.revokeObjectURL(newPreviews[key])
          delete newPreviews[key]
        }
        return newPreviews
      })
      setHasChanges(true)
    }
  }

  const handleClearAllImages = (productId: number) => {
    const product = products.find(p => p.id === productId)
    if (!product || !product.stages) return

    setUploadedImages(prev => {
      const newImages = { ...prev }
      product.stages?.forEach((stage: any) => {
        const key = `${productId}-${stage.id}`
        delete newImages[key]
      })
      return newImages
    })
    setImagePreviews(prev => {
      const newPreviews = { ...prev }
      product.stages?.forEach((stage: any) => {
        const key = `${productId}-${stage.id}`
        if (newPreviews[key]) {
          URL.revokeObjectURL(newPreviews[key])
          delete newPreviews[key]
        }
      })
      return newPreviews
    })
    setHasChanges(true)
    toast({
      title: "Images Cleared",
      description: "All images cleared for this product",
    })
  }

  // Handler to delete individual image
  const handleDeleteImage = (productId: number, stageId: number) => {
    handleImageUpload(productId, stageId, null)
  }

  // Update ref whenever imagePreviews changes
  useEffect(() => {
    imagePreviewsRef.current = imagePreviews
  }, [imagePreviews])

  // Cleanup preview URLs when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Cleanup all preview URLs when modal closes
      Object.values(imagePreviewsRef.current).forEach(url => {
        URL.revokeObjectURL(url)
      })
      setImagePreviews({})
      imagePreviewsRef.current = {}
    }
  }, [isOpen])

  const getImageStatusIcon = (status: string) => {
    switch (status) {
      case "all":
        return <div className="w-3 h-3 bg-green-500 rounded-full" />
      case "some":
        return <div className="w-3 h-3 bg-yellow-500 rounded-full" />
      case "none":
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />
    }
  }

  const getImageStatusText = (status: string) => {
    switch (status) {
      case "all":
        return "All Image Configured"
      case "some":
        return "Some Image Configured"
      case "none":
      default:
        return "No Image Configured"
    }
  }

  // Calculate image status for a product based on uploaded images and selected stages
  const calculateImageStatus = (productId: number): "none" | "some" | "all" => {
    // If product is not selected, return "none"
    if (!selectedProducts.includes(productId)) {
      return "none"
    }

    // If no stages are selected, return "none"
    if (selectedStages.length === 0) {
      return "none"
    }

    // Count how many selected stages have images uploaded for this product
    let imagesCount = 0
    selectedStages.forEach((stageId) => {
      const imageKey = `${productId}-${stageId}`
      if (uploadedImages[imageKey]) {
        imagesCount++
      }
    })

    // Determine status based on image count
    if (imagesCount === 0) {
      return "none"
    } else if (imagesCount === selectedStages.length) {
      return "all"
    } else {
      return "some"
    }
  }

  const handleApply = async () => {
    // Use custom apply handler if provided
    if (onApply) {
      onApply(selectedStages, selectedProducts)
      setHasChanges(false)
      onClose()
      return
    }

    // Default behavior - call API to link stages to products
    if (selectedStages.length === 0 || selectedProducts.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one stage and one product.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Build the payload for multiple stages
      const payload = buildLinkPayload(
        selectedStages,
        selectedProducts,
        products,
        stages
      )

      // Call the API
      const response = await linkStagesToProducts(payload)

      // Check both 'success' and 'status' fields for compatibility
      const isSuccess = response.success || response.status

      if (isSuccess) {
        console.log("API call successful - closing modal")
        toast({
          title: "Success",
          description: response.message || "Stages linked to products successfully!",
        })
        setHasChanges(false)

        // Update image status for linked products
        setApiProducts(prevProducts =>
          prevProducts.map(product => {
            if (selectedProducts.includes(product.id)) {
              // Product was just linked with stages - update status to "some"
              return {
                ...product,
                imageStatus: "some" as const,
                stages: [
                  ...(product.stages || []),
                  ...selectedStages.map(stageId => {
                    const stage = stages.find(s => s.id === stageId)
                    return stage
                  }).filter(Boolean)
                ]
              }
            }
            return product
          })
        )

        // Reset selections
        setSelectedStages([])
        setSelectedProducts([])
        setExpandedProduct(null)

        // Close the modal after successful linking
        onClose()
      } else {
        throw new Error(response.message || "Failed to link stages to products")
      }
    } catch (error: any) {
      console.error("Error linking stages to products:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to link stages to products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      setIsDiscardDialogOpen(true)
    } else {
      onClose()
    }
  }

  const handleDiscard = () => {
    setHasChanges(false)
    setIsDiscardDialogOpen(false)
    onClose()
  }

  const handleKeepEditing = () => {
    setIsDiscardDialogOpen(false)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-full w-screen h-screen max-h-screen p-0 gap-0 overflow-hidden bg-white rounded-none sm:rounded-none m-0 left-0 top-0 translate-x-0 translate-y-0">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                Assign Stages to Products {context === "lab" ? "(Lab)" : "(Global)"}
              </DialogTitle>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Select Stages */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="41.2246" height="41.2246" rx="6" fill="#1162A8" />
                    <path d="M18.9942 30.9121V15.9121C18.9942 15.6469 18.8888 15.3925 18.7013 15.205C18.5138 15.0175 18.2594 14.9121 17.9942 14.9121H12.9942C12.4638 14.9121 11.9551 15.1228 11.58 15.4979C11.2049 15.873 10.9942 16.3817 10.9942 16.9121V28.9121C10.9942 29.4425 11.2049 29.9512 11.58 30.3263C11.9551 30.7014 12.4638 30.9121 12.9942 30.9121H24.9942C25.5246 30.9121 26.0333 30.7014 26.4084 30.3263C26.7835 29.9512 26.9942 29.4425 26.9942 28.9121V23.9121C26.9942 23.6469 26.8888 23.3925 26.7013 23.205C26.5138 23.0175 26.2594 22.9121 25.9942 22.9121H10.9942" stroke="white" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M29.9942 10.9121H23.9942C23.4419 10.9121 22.9942 11.3598 22.9942 11.9121V17.9121C22.9942 18.4644 23.4419 18.9121 23.9942 18.9121H29.9942C30.5465 18.9121 30.9942 18.4644 30.9942 17.9121V11.9121C30.9942 11.3598 30.5465 10.9121 29.9942 10.9121Z" stroke="white" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                  <h3 className="font-semibold text-gray-900">Select Stages to Assign</h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedStages.includes(stage.id)}
                          onCheckedChange={(checked) => handleStageSelect(stage.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                        <span className="font-medium text-gray-900">{stage.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-600">${stage.price || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllStages}
                      className="text-gray-700 border-gray-300 hover:bg-gray-100"
                    >
                      {selectedStages.length === stages.length ? "Clear all" : "Select all"}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedStages.length} stage{selectedStages.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>

            {/* Right Panel - Select Products */}
            <div className="w-1/2 flex flex-col">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="41.2246" height="41.2246" rx="6" fill="#1162A8" />
                    <path d="M20.9942 30.9121V21.9121" stroke="white" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M24.1642 11.1225C24.4133 10.9833 24.6938 10.9102 24.9792 10.9102C25.2645 10.9102 25.5451 10.9833 25.7942 11.1225L29.9942 13.4825C30.2916 13.6507 30.5391 13.8949 30.7113 14.1901C30.8835 14.4852 30.9742 14.8208 30.9742 15.1625C30.9742 15.5042 30.8835 15.8398 30.7113 16.135C30.5391 16.4302 30.2916 16.6743 29.9942 16.8425L17.8142 23.7025C17.5644 23.845 17.2818 23.92 16.9942 23.92C16.7066 23.92 16.424 23.845 16.1742 23.7025L11.9942 21.3425C11.6967 21.1743 11.4493 20.9302 11.2771 20.635C11.1049 20.3398 11.0142 20.0042 11.0142 19.6625C11.0142 19.3208 11.1049 18.9852 11.2771 18.6901C11.4493 18.3949 11.6967 18.1507 11.9942 17.9825L24.1642 11.1225Z" stroke="white" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M28.9942 21.9121V25.7821C28.9946 26.1596 28.8913 26.5299 28.6955 26.8526C28.4998 27.1753 28.2191 27.438 27.8842 27.6121L21.8842 30.6921C21.6093 30.835 21.304 30.9096 20.9942 30.9096C20.6844 30.9096 20.3791 30.835 20.1042 30.6921L14.1042 27.6121C13.7693 27.438 13.4886 27.1753 13.2929 26.8526C13.0971 26.5299 12.9938 26.1596 12.9942 25.7821V21.9121" stroke="white" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M29.9942 21.3424C30.2916 21.1742 30.5391 20.93 30.7113 20.6348C30.8835 20.3397 30.9742 20.0041 30.9742 19.6624C30.9742 19.3206 30.8835 18.985 30.7113 18.6899C30.5391 18.3947 30.2916 18.1506 29.9942 17.9824L17.8242 11.1124C17.5761 10.9703 17.2951 10.8955 17.0092 10.8955C16.7233 10.8955 16.4423 10.9703 16.1942 11.1124L11.9942 13.4824C11.6967 13.6506 11.4493 13.8947 11.2771 14.1899C11.1049 14.485 11.0142 14.8206 11.0142 15.1624C11.0142 15.5041 11.1049 15.8397 11.2771 16.1348C11.4493 16.43 11.6967 16.6741 11.9942 16.8424L24.1742 23.7024C24.4222 23.8448 24.7032 23.9198 24.9892 23.9198C25.2752 23.9198 25.5562 23.8448 25.8042 23.7024L29.9942 21.3424Z" stroke="white" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>

                  <h3 className="font-semibold text-gray-900">Assign to These Products</h3>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab("individual")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "individual"
                        ? "bg-[#1162a8] text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                  >
                    By Individual Products
                  </button>
                  <button
                    onClick={() => setActiveTab("category")}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "category"
                        ? "bg-[#1162a8] text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                  >
                    By Category
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search Products..."
                    className="pr-10 h-10 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Products List */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[#1162a8] mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading products...</p>
                    </div>
                  </div>
                ) : productsError ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-sm text-red-600 mb-2">Error: {productsError}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="text-gray-700 border-gray-300 hover:bg-gray-100"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : activeTab === "category" ? (
                  // Category View
                  categories.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No categories available</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categories.map((category) => {
                        const categoryProducts = products.filter(p => p.category === category)
                        const selectedCount = categoryProducts.filter(p => selectedProducts.includes(p.id)).length
                        const isAllSelected = selectedCount === categoryProducts.length && categoryProducts.length > 0

                        return (
                          <div key={category} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isAllSelected}
                                  onCheckedChange={(checked) => handleCategorySelect(category, !!checked)}
                                  className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                                />
                                <span className="font-medium text-gray-900">{category}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {selectedCount}/{categoryProducts.length} selected
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                ) : filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {searchQuery ? "No products found matching your search" : "No products available"}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Individual Products View
                  <div className="space-y-3">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="border border-gray-200 rounded-lg">
                        <div className="p-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedProducts.includes(product.id)}
                                onCheckedChange={(checked) => handleProductSelect(product.id, !!checked)}
                                className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                              />
                              <span className="font-medium text-gray-900">{product.name}</span>
                              <div className="flex items-center gap-2">
                                {getImageStatusIcon(calculateImageStatus(product.id))}
                                <ImageIcon className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          </div>
                        </div>

                        {/* Expandable Image Configuration Section */}
                        {selectedProducts.includes(product.id) && (
                          <div className="px-3 pb-3 border-t border-gray-100">
                            <button
                              onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                              className="w-full text-left py-2 text-sm text-gray-600 hover:text-gray-900"
                            >
                              Configure images
                            </button>

                            {expandedProduct === product.id && (
                              <div className="mt-2 space-y-3">
                                {selectedStages.length > 0 ? (
                                  // Show only the selected stages for image upload
                                  selectedStages.map((stageId) => {
                                    const stage = stages.find(s => s.id === stageId)
                                    if (!stage) return null

                                    const imageKey = `${product.id}-${stage.id}`
                                    const hasImage = uploadedImages[imageKey]

                                    const previewUrl = imagePreviews[imageKey]

                                    return (
                                      <div key={stage.id} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          {/* Image Preview */}
                                          {previewUrl ? (
                                            <div className="relative w-16 h-16 border border-gray-200 rounded overflow-hidden flex-shrink-0">
                                              <img
                                                src={previewUrl}
                                                alt={hasImage?.name || stage.name}
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          ) : (
                                            <div className="w-16 h-16 border border-gray-200 rounded flex items-center justify-center flex-shrink-0 bg-gray-50">
                                              <ImageIcon className="h-6 w-6 text-gray-400" />
                                            </div>
                                          )}
                                          
                                          {/* Input and Buttons */}
                                          <div className="flex-1 flex items-center gap-2">
                                            <Input
                                              value={hasImage ? hasImage.name : ''}
                                              placeholder={stage.name}
                                              className="flex-1 h-8 text-sm"
                                              readOnly
                                            />
                                            <label htmlFor={`file-${imageKey}`}>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0"
                                                type="button"
                                                onClick={() => document.getElementById(`file-${imageKey}`)?.click()}
                                                title="Upload image"
                                              >
                                                <Upload className="h-4 w-4" />
                                              </Button>
                                            </label>
                                            {hasImage && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                type="button"
                                                onClick={() => handleDeleteImage(product.id, stage.id)}
                                                title="Delete image"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <input
                                          id={`file-${imageKey}`}
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                              handleImageUpload(product.id, stage.id, file)
                                            }
                                            // Reset input to allow selecting the same file again
                                            e.target.value = ''
                                          }}
                                        />
                                      </div>
                                    )
                                  })
                                ) : (
                                  <div className="text-sm text-gray-500 text-center py-2">
                                    Please select stages to upload images
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">Use default for all</span>
                                  <button
                                    className="text-red-600 hover:text-red-800"
                                    onClick={() => handleClearAllImages(product.id)}
                                  >
                                    Clear all images
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions and Legend */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                {activeTab === "category" ? (
                  // Category tab footer
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllCategories}
                          className="text-gray-700 border-gray-300 hover:bg-gray-100"
                        >
                          {selectedCategories.length === categories.length ? "Clear all" : "Select all"}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected from {selectedCategories.length} categor{selectedCategories.length !== 1 ? 'ies' : 'y'}
                    </p>
                  </div>
                ) : (
                  // Individual products tab footer
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Legend:</p>
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>All Image Configured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span>Some Image Configured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        <span>No Image Configured</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t">
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                disabled={selectedStages.length === 0 || selectedProducts.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Apply stages to selected products
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={isDiscardDialogOpen}
        type="stage"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />

      {/* Loading Overlay for Linking */}
      <LoadingOverlay
        isLoading={isSubmitting}
        title="Linking Stages to Products..."
        message="Please wait while we link the selected stages to products."
        zIndex={99999}
      />
    </>
  )
}
