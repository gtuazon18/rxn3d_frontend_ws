"use client"

import { useState, useEffect, useRef } from "react"
import { X, Search, Package, Square, Upload, Image as ImageIcon, Loader2, Trash2 } from "lucide-react"
import { getStageVariations } from "@/services/stage-variations-api"
import { getMaterialVariations } from "@/services/material-variations-api"
import { getRetentionVariations } from "@/services/retention-variations-api"
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
import { useMaterials, type Material } from "@/contexts/product-materials-context"
import { useImpressions, type Impression } from "@/contexts/product-impression-context"
import { useRetention } from "@/contexts/product-retention-context"
import { useTranslation } from "react-i18next"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { fetchProductsWithCache } from "@/services/product-modal-api"
import { linkStagesToProducts, buildLinkPayload } from "@/services/stage-product-link-api"
import { linkMaterialsToProducts, buildMaterialLinkPayload } from "@/services/material-product-link-api"
import { linkImpressionsToProducts, buildImpressionLinkPayload } from "@/services/impression-product-link-api"
import { linkRetentionsToProducts, buildRetentionLinkPayload } from "@/services/retention-product-link-api"
import { useToast } from "@/hooks/use-toast"
import { LoadingOverlay } from "@/components/ui/loading-overlay"

interface Product {
  id: number
  name: string
  category: string
  imageStatus: "none" | "some" | "all"
  isSelected: boolean
  stages?: any[]
  materials?: any[]
  impressions?: any[]
  retentions?: any[]
}

type EntityType = "stage" | "material" | "impression" | "retention"

interface LinkProductsModalProps {
  isOpen: boolean
  onClose: () => void
  entityType?: EntityType // Type of entity being linked (stage, material, impression)
  context?: "global" | "lab" // Add context prop to differentiate between global and lab usage
  onApply?: (selectedEntities: number[], selectedProducts: number[]) => void // Custom apply handler
  customProducts?: Product[] // Allow custom product data to be passed in
}

// Mock data removed - now using API data from fetchProductsWithCache

export function LinkProductsModal({ isOpen, onClose, entityType = "stage", context = "global", onApply, customProducts }: LinkProductsModalProps) {
  const { stages } = useStages()
  const { materials } = useMaterials()
  const { impressions } = useImpressions()
  const { retentions } = useRetention()
  const { t } = useTranslation()
  const { toast } = useToast()

  // Get entities based on entityType
  const getEntities = () => {
    switch (entityType) {
      case "material":
        return materials
      case "impression":
        return impressions
      case "retention":
        return retentions
      case "stage":
      default:
        return stages
    }
  }

  const entities = getEntities()

  // Get entity name for labels
  const getEntityName = (singular: boolean = false) => {
    switch (entityType) {
      case "material":
        return singular ? "Material" : "Materials"
      case "impression":
        return singular ? "Impression" : "Impressions"
      case "retention":
        return singular ? "Retention" : "Retentions"
      case "stage":
      default:
        return singular ? "Stage" : "Stages"
    }
  }

  const [selectedEntities, setSelectedEntities] = useState<number[]>([]) // Multiple entity selection
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

  // Image upload state - stores images for each product-entity combination
  const [uploadedImages, setUploadedImages] = useState<Record<string, File>>({})
  // Image preview URLs for displaying thumbnails
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({})
  // Ref to track preview URLs for cleanup without causing re-renders
  const imagePreviewsRef = useRef<Record<string, string>>({})
  // Track selected variation names for display
  const [selectedVariationNames, setSelectedVariationNames] = useState<Record<string, string>>({})
  // Track selected variation IDs for API submission
  const [selectedVariationIds, setSelectedVariationIds] = useState<Record<string, number | null>>({})

  // Variation selection modal state
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [currentProductId, setCurrentProductId] = useState<number | null>(null)
  const [currentEntityId, setCurrentEntityId] = useState<number | null>(null)
  const [variations, setVariations] = useState<any[]>([])
  const [isLoadingVariations, setIsLoadingVariations] = useState(false)
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null)
  
  // Image preview modal state
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [previewImageName, setPreviewImageName] = useState<string>("")

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

  // Reset selections when modal opens/closes or entityType changes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEntities([])
      setSelectedProducts([])
      setHasChanges(false)
    }
  }, [isOpen, entityType])

  // Initialize selected products with pre-selected items from the products data
  useEffect(() => {
    if (products.length > 0 && selectedProducts.length === 0 && isOpen) {
      const preSelected = products.filter(p => p.isSelected).map(p => p.id)
      setSelectedProducts(preSelected)
    }
  }, [products, selectedProducts.length, isOpen])

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEntitySelect = (entityId: number, checked: boolean) => {
    if (checked) {
      setSelectedEntities([...selectedEntities, entityId])
    } else {
      setSelectedEntities(selectedEntities.filter(id => id !== entityId))
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

  const handleSelectAllEntities = () => {
    if (selectedEntities.length === entities.length) {
      setSelectedEntities([])
    } else {
      setSelectedEntities(entities.map((entity: any) => entity.id))
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

  const handleImageUpload = (productId: number, entityId: number, file: File | null) => {
    const key = `${productId}-${entityId}`
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
      // Clear variation name and ID when uploading new file
      setSelectedVariationNames(prev => {
        const newNames = { ...prev }
        delete newNames[key]
        return newNames
      })
      setSelectedVariationIds(prev => {
        const newIds = { ...prev }
        delete newIds[key]
        return newIds
      })
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
        if (newPreviews[key] && newPreviews[key].startsWith('blob:')) {
          URL.revokeObjectURL(newPreviews[key])
        }
        delete newPreviews[key]
        return newPreviews
      })
      // Clear variation name and ID
      setSelectedVariationNames(prev => {
        const newNames = { ...prev }
        delete newNames[key]
        return newNames
      })
      setSelectedVariationIds(prev => {
        const newIds = { ...prev }
        delete newIds[key]
        return newIds
      })
      setHasChanges(true)
    }
  }

  const handleClearAllImages = (productId: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    // Get the appropriate property based on entityType
    const entityList = entityType === "material" 
      ? (product.materials || [])
      : entityType === "impression"
      ? (product.impressions || [])
      : entityType === "retention"
      ? (product.retentions || [])
      : (product.stages || [])

    setUploadedImages(prev => {
      const newImages = { ...prev }
      entityList.forEach((entity: any) => {
        const key = `${productId}-${entity.id}`
        delete newImages[key]
      })
      return newImages
    })
    setImagePreviews(prev => {
      const newPreviews = { ...prev }
      entityList.forEach((entity: any) => {
        const key = `${productId}-${entity.id}`
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
  const handleDeleteImage = (productId: number, entityId: number) => {
    handleImageUpload(productId, entityId, null)
  }

  // Fetch variations for an entity
  const fetchVariations = async (entityId: number) => {
    setIsLoadingVariations(true)
    try {
      let response: any
      switch (entityType) {
        case "material":
          response = await getMaterialVariations({ material_id: entityId, per_page: 100 })
          break
        case "retention":
          response = await getRetentionVariations({ retention_id: entityId, per_page: 100 })
          break
        case "stage":
        default:
          response = await getStageVariations({ stage_id: entityId, per_page: 100 })
          break
      }
      setVariations(response.data.data || [])
    } catch (error) {
      console.error("Failed to fetch variations:", error)
      setVariations([])
    } finally {
      setIsLoadingVariations(false)
    }
  }

  // Open variation selection modal
  const handleOpenVariationModal = async (productId: number, entityId: number) => {
    setCurrentProductId(productId)
    setCurrentEntityId(entityId)
    setShowVariationModal(true)
    setSelectedVariationId(null)
    await fetchVariations(entityId)
  }

  // Handle variation selection
  const handleSelectVariation = (variation: any) => {
    if (!currentProductId || !currentEntityId) return

    setSelectedVariationId(variation.id)

    // Small delay to show selection feedback before closing
    setTimeout(() => {
      const imageKey = `${currentProductId}-${currentEntityId}`

      // Store the variation URL as preview
      setImagePreviews(prev => ({
        ...prev,
        [imageKey]: variation.image_url
      }))

      // Store the variation name for display
      setSelectedVariationNames(prev => ({
        ...prev,
        [imageKey]: variation.name
      }))

      // Store the variation ID for API submission
      setSelectedVariationIds(prev => ({
        ...prev,
        [imageKey]: variation.id
      }))

      // Create a mock file object to track that an image is selected
      // We'll use the variation URL when submitting
      const mockFile = new File([], variation.name, { type: 'image/jpeg' })
      setUploadedImages(prev => ({
        ...prev,
        [imageKey]: mockFile
      }))

      setHasChanges(true)
      setShowVariationModal(false)
      setSelectedVariationId(null)

      toast({
        title: "Variation Selected",
        description: `Selected "${variation.name}"`,
      })
    }, 200)
  }

  // Handle upload new photo
  const handleUploadNewPhoto = () => {
    if (!currentProductId || !currentEntityId) return
    
    const imageKey = `${currentProductId}-${currentEntityId}`
    const fileInputId = `file-${imageKey}`
    
    setShowVariationModal(false)
    setSelectedVariationId(null)
    
    // Trigger file input click
    setTimeout(() => {
      document.getElementById(fileInputId)?.click()
    }, 100)
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
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
      setImagePreviews({})
      imagePreviewsRef.current = {}
      setSelectedVariationNames({})
      setSelectedVariationIds({})
      setShowVariationModal(false)
      setCurrentProductId(null)
      setCurrentEntityId(null)
      setVariations([])
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

  // Calculate image status for a product based on uploaded images and selected entities
  const calculateImageStatus = (productId: number): "none" | "some" | "all" => {
    // If product is not selected, return "none"
    if (!selectedProducts.includes(productId)) {
      return "none"
    }

    // If no entities are selected, return "none"
    if (selectedEntities.length === 0) {
      return "none"
    }

    // Count how many selected entities have images uploaded for this product
    let imagesCount = 0
    selectedEntities.forEach((entityId) => {
      const imageKey = `${productId}-${entityId}`
      if (uploadedImages[imageKey]) {
        imagesCount++
      }
    })

    // Determine status based on image count
    if (imagesCount === 0) {
      return "none"
    } else if (imagesCount === selectedEntities.length) {
      return "all"
    } else {
      return "some"
    }
  }

  const handleApply = async () => {
    // Use custom apply handler if provided
    if (onApply) {
      onApply(selectedEntities, selectedProducts)
      setHasChanges(false)
      onClose()
      return
    }

    // Default behavior - call API to link entities to products
    if (selectedEntities.length === 0 || selectedProducts.length === 0) {
      toast({
        title: "Selection Required",
        description: `Please select at least one ${getEntityName(true).toLowerCase()} and one product.`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let response: any

      // Call the appropriate API based on entityType
      switch (entityType) {
        case "material": {
          const payload = buildMaterialLinkPayload(
            selectedEntities,
            selectedProducts,
            products,
            materials,
            selectedVariationIds,
            uploadedImages,
            imagePreviews
          )
          response = await linkMaterialsToProducts(payload)
          break
        }
        case "impression": {
          const payload = buildImpressionLinkPayload(
            selectedEntities,
            selectedProducts,
            products,
            impressions
          )
          response = await linkImpressionsToProducts(payload)
          break
        }
        case "retention": {
          const payload = buildRetentionLinkPayload(
            selectedEntities,
            selectedProducts,
            products,
            retentions
          )
          response = await linkRetentionsToProducts(payload)
          break
        }
        case "stage":
        default: {
          const payload = buildLinkPayload(
            selectedEntities,
            selectedProducts,
            products,
            stages
          )
          response = await linkStagesToProducts(payload)
          break
        }
      }

      // Check both 'success' and 'status' fields for compatibility
      const isSuccess = response.success || response.status

      if (isSuccess) {
        console.log("API call successful - closing modal")
        toast({
          title: "Success",
          description: response.message || `${getEntityName()} linked to products successfully!`,
        })
        setHasChanges(false)

        // Update image status for linked products
        setApiProducts(prevProducts =>
          prevProducts.map(product => {
            if (selectedProducts.includes(product.id)) {
              // Product was just linked with entities - update status to "some"
              const entityProperty = entityType === "material" ? "materials" : entityType === "impression" ? "impressions" : entityType === "retention" ? "retentions" : "stages"
              return {
                ...product,
                imageStatus: "some" as const,
                [entityProperty]: [
                  ...(product[entityProperty as keyof Product] as any[] || []),
                  ...selectedEntities.map(entityId => {
                    const entity = entities.find((e: any) => e.id === entityId)
                    return entity
                  }).filter(Boolean)
                ]
              }
            }
            return product
          })
        )

        // Reset selections
        setSelectedEntities([])
        setSelectedProducts([])
        setExpandedProduct(null)

        // Close the modal after successful linking
        onClose()
      } else {
        throw new Error(response.message || `Failed to link ${getEntityName(true).toLowerCase()}s to products`)
      }
    } catch (error: any) {
      console.error(`Error linking ${getEntityName(true).toLowerCase()}s to products:`, error)
      toast({
        title: "Error",
        description: error.message || `Failed to link ${getEntityName(true).toLowerCase()}s to products. Please try again.`,
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
                Assign {getEntityName()} to Products {context === "lab" ? "(Lab)" : "(Global)"}
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

                  <h3 className="font-semibold text-gray-900">Select {getEntityName()} to Assign</h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {entities.map((entity: any) => (
                    <div key={entity.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedEntities.includes(entity.id)}
                          onCheckedChange={(checked) => handleEntitySelect(entity.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                        <span className="font-medium text-gray-900">{entity.name}</span>
                      </div>
                      {(entity.price !== undefined || (entity as any).lab_material?.price !== undefined || (entity as any).lab_retention?.price !== undefined) && (
                        <span className="text-sm font-semibold text-gray-600">
                          ${typeof entity.price === 'number' ? entity.price : (entity as any).lab_material?.price || (entity as any).lab_retention?.price || 0}
                        </span>
                      )}
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
                      onClick={handleSelectAllEntities}
                      className="text-gray-700 border-gray-300 hover:bg-gray-100"
                    >
                      {selectedEntities.length === entities.length ? "Clear all" : "Select all"}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedEntities.length} {getEntityName(true).toLowerCase()}{selectedEntities.length !== 1 ? 's' : ''} selected
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
                                {selectedEntities.length > 0 ? (
                                  // Show only the selected entities for image upload
                                  selectedEntities.map((entityId) => {
                                    const entity = entities.find((e: any) => e.id === entityId)
                                    if (!entity) return null

                                    const imageKey = `${product.id}-${entity.id}`
                                    const hasImage = uploadedImages[imageKey]

                                    const previewUrl = imagePreviews[imageKey]

                                    return (
                                      <div key={entity.id} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          {/* Image Preview - Clickable for larger view */}
                                          {previewUrl ? (
                                            <div 
                                              className="relative w-20 h-20 border-2 border-gray-300 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:border-[#1162a8] transition-colors group"
                                              onClick={() => {
                                                setPreviewImageUrl(previewUrl)
                                                setPreviewImageName(selectedVariationNames[imageKey] || (hasImage ? hasImage.name : entity.name))
                                                setShowImagePreviewModal(true)
                                              }}
                                              title="Click to preview"
                                            >
                                              <img
                                                src={previewUrl}
                                                alt={selectedVariationNames[imageKey] || (hasImage ? hasImage.name : entity.name)}
                                                className="w-full h-full object-cover"
                                              />
                                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                                                <ImageIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-50">
                                              <ImageIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                          )}
                                          
                                          {/* Input and Buttons */}
                                          <div className="flex-1 flex items-center gap-2">
                                            <Input
                                              value={selectedVariationNames[imageKey] || (hasImage ? hasImage.name : '')}
                                              placeholder={entity.name}
                                              className="flex-1 h-8 text-sm"
                                              readOnly
                                            />
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8 w-8 p-0"
                                              type="button"
                                              onClick={() => handleOpenVariationModal(product.id, entity.id)}
                                              title="Change photo"
                                            >
                                              <Upload className="h-4 w-4" />
                                            </Button>
                                            {hasImage && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                type="button"
                                                onClick={() => handleDeleteImage(product.id, entity.id)}
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
                                              handleImageUpload(product.id, entity.id, file)
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
                                    Please select {getEntityName(true).toLowerCase()}s to upload images
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
                disabled={selectedEntities.length === 0 || selectedProducts.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Apply {getEntityName(true).toLowerCase()}s to selected products
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={isDiscardDialogOpen}
        type={entityType === "material" ? "material" : entityType === "impression" ? "impression" : entityType === "retention" ? "retention" : "stage"}
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />

      {/* Loading Overlay for Linking */}
      <LoadingOverlay
        isLoading={isSubmitting}
        title={`Linking ${getEntityName()} to Products...`}
        message={`Please wait while we link the selected ${getEntityName(true).toLowerCase()}s to products.`}
        zIndex={99999}
      />

      {/* Variation Selection Modal */}
      <Dialog open={showVariationModal} onOpenChange={setShowVariationModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Change {getEntityName(true)} photo</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {isLoadingVariations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
              </div>
            ) : variations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No variations available. Please upload a new photo.
              </div>
            ) : (
              <div className="space-y-2">
                {variations.map((variation) => (
                  <button
                    key={variation.id}
                    onClick={() => handleSelectVariation(variation)}
                    className={`w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedVariationId === variation.id
                        ? "border-[#1162a8] bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    {variation.image_url ? (
                      <img
                        src={variation.image_url}
                        alt={variation.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <span className="flex-1 text-left font-medium text-gray-900">
                      {variation.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVariationModal(false)
                setSelectedVariationId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadNewPhoto}
              className="bg-[#1162a8] hover:bg-[#0d4d87] text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload new photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={showImagePreviewModal} onOpenChange={setShowImagePreviewModal}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>{previewImageName || "Image Preview"}</DialogTitle>
              <button 
                onClick={() => setShowImagePreviewModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          
          <div className="p-6 flex items-center justify-center bg-gray-50 min-h-[400px]">
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt={previewImageName}
                className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-center text-gray-500">
                <ImageIcon className="h-16 w-16 mx-auto mb-2 text-gray-400" />
                <p>No image to preview</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
