"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Info, X, Trash2 } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useRetention } from "@/contexts/product-retention-context"
import { useAuth } from "@/contexts/auth-context"
import { generateCodeFromName } from "@/lib/utils"
import {
  getRetentionVariations,
  createRetentionVariation,
  updateRetentionVariation,
  deleteRetentionVariation,
  fileToBase64,
  type RetentionVariation,
} from "@/services/retention-variations-api"
import { LinkProductsModal } from "./link-products-modal"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CreateRetentionModalProps {
  isOpen: boolean
  onClose: () => void
  retention?: any | null
  isCopying?: boolean // Flag to indicate if we're copying a retention
}

export function CreateRetentionModal({ isOpen, onClose, retention, isCopying = false }: CreateRetentionModalProps) {
  const { createRetention, updateRetention, getRetentionDetail } = useRetention()
  const { user } = useAuth()
  const [retentionName, setRetentionName] = useState("")
  const [retentionCode, setRetentionCode] = useState("")
  const [price, setPrice] = useState("")
  const [additionalPrice, setAdditionalPrice] = useState("")
  const [priceOption, setPriceOption] = useState("no-price")
  const [detailsEnabled, setDetailsEnabled] = useState(true)
  const [linkToProductsExpanded, setLinkToProductsExpanded] = useState(false)
  const [imageVariationsOpen, setImageVariationsOpen] = useState(false)
  const [showLinkProductsModal, setShowLinkProductsModal] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Image Variations state management
  const [variations, setVariations] = useState<RetentionVariation[]>([])
  const [isLoadingVariations, setIsLoadingVariations] = useState(false)
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [editingVariation, setEditingVariation] = useState<RetentionVariation | null>(null)
  const [variationFormData, setVariationFormData] = useState({
    name: "",
    image: null as File | null,
    imagePreview: null as string | null,
    status: "Active" as "Active" | "Inactive",
    is_default: "No" as "Yes" | "No",
  })
  const variationFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Helper to check lab admin role (matches context logic)
  const isLabAdmin = (() => {
    if (!user) return false
    if (user.roles && user.roles.length > 0) {
      return user.roles[0] === "lab_admin"
    }
    return user.role === "lab_admin"
  })()

  // Get customer ID for lab admin
  const customerId = isLabAdmin ? user?.customers?.find((customer) => customer.id)?.id : undefined

  // Track changes
  useEffect(() => {
    const hasAnyChanges =
      retentionName.trim() !== "" ||
      retentionCode.trim() !== "" ||
      (isLabAdmin && price.trim() !== "") ||
      additionalPrice.trim() !== "" ||
      priceOption !== "no-price"
    setHasChanges(hasAnyChanges)
  }, [retentionName, retentionCode, price, additionalPrice, priceOption, isLabAdmin])

  // Clear errors when user starts typing
  useEffect(() => {
    if (retentionName.trim() !== "" && errors.retentionName) {
      setErrors((prev) => ({ ...prev, retentionName: "" }))
    }
  }, [retentionName, errors.retentionName])

  useEffect(() => {
    if (retentionCode.trim() !== "" && errors.retentionCode) {
      setErrors((prev) => ({ ...prev, retentionCode: "" }))
    }
  }, [retentionCode, errors.retentionCode])

  useEffect(() => {
    if (price.trim() !== "" && errors.price) {
      setErrors((prev) => ({ ...prev, price: "" }))
    }
  }, [price, errors.price])

  // Fetch retention variations
  const fetchVariations = useCallback(async () => {
    if (!retention?.id) return
    
    setIsLoadingVariations(true)
    try {
      const response = await getRetentionVariations({ retention_id: retention.id, per_page: 100 })
      setVariations(response.data.data || [])
    } catch (error) {
      console.error("Failed to fetch variations:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load variations",
        variant: "destructive",
      })
    } finally {
      setIsLoadingVariations(false)
    }
  }, [retention?.id, toast])

  // Fetch variations when retention is set (edit mode) or when variations section is opened
  useEffect(() => {
    if (isOpen && imageVariationsOpen && retention?.id) {
      fetchVariations()
    }
  }, [isOpen, imageVariationsOpen, retention?.id, fetchVariations])

  useEffect(() => {
    let ignore = false

    async function fetchAndSetDetail() {
      if (isCopying && retention) {
        // Copying: use the provided retention data directly (no API call needed)
        setRetentionName(retention.name || "")
        setRetentionCode(retention.code || "")
        setPrice(retention.price ? retention.price.toString() : "")
        setPriceOption(retention.price ? "with-price" : "no-price")
      } else if (retention && retention.id && !isCopying) {
        // Editing: fetch detail from API
        const detail = await getRetentionDetail(retention.id)
        if (!ignore && detail) {
          setRetentionName(detail.name || "")
          setRetentionCode(detail.code || "")
          setPrice(detail.price ? detail.price.toString() : "")
          setPriceOption(detail.price ? "with-price" : "no-price")
        }
      } else {
        // New retention: reset form
        setRetentionName("")
        setRetentionCode("")
        setPrice("")
        setPriceOption("no-price")
      }
      setErrors({})
      setHasChanges(false)
    }

    fetchAndSetDetail()
    return () => { ignore = true }
  }, [retention, isOpen, getRetentionDetail, isCopying])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!retentionName.trim()) {
      newErrors.retentionName = "Retention name is required"
    }

    if (!retentionCode.trim()) {
      newErrors.retentionCode = "Retention code is required"
    }

    if (isLabAdmin) {
      if (!price.trim()) {
        newErrors.price = "Price is required"
      } else if (isNaN(Number(price))) {
        newErrors.price = "Price must be a valid number"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }

  // Handle create variation
  const handleCreateVariation = async () => {
    if (!retention?.id) {
      toast({
        title: "Error",
        description: "Retention ID is required. Please save the retention first.",
        variant: "destructive",
      })
      return
    }

    if (!variationFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Variation name is required",
        variant: "destructive",
      })
      return
    }

    if (!variationFormData.image) {
      toast({
        title: "Error",
        description: "Image is required",
        variant: "destructive",
      })
      return
    }

    try {
      const imageBase64 = await fileToBase64(variationFormData.image)
      const payload = {
        retention_id: retention.id,
        name: variationFormData.name.trim(),
        image: imageBase64,
        status: variationFormData.status,
        is_default: variationFormData.is_default,
      }

      await createRetentionVariation(payload)
      toast({
        title: "Success",
        description: "Variation created successfully",
      })
      
      // Reset form and close modal
      setVariationFormData({
        name: "",
        image: null,
        imagePreview: null,
        status: "Active",
        is_default: "No",
      })
      setShowVariationModal(false)
      setEditingVariation(null)
      
      // Refresh variations list
      await fetchVariations()
    } catch (error) {
      console.error("Failed to create variation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create variation",
        variant: "destructive",
      })
    }
  }

  // Handle update variation
  const handleUpdateVariation = async (variation: RetentionVariation, updates: any) => {
    try {
      await updateRetentionVariation(variation.id, updates)
      toast({
        title: "Success",
        description: "Variation updated successfully",
      })
      await fetchVariations()
    } catch (error) {
      console.error("Failed to update variation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update variation",
        variant: "destructive",
      })
    }
  }

  // Handle delete variation
  const handleDeleteVariation = async (variation: RetentionVariation) => {
    if (!confirm(`Are you sure you want to delete "${variation.name}"?`)) {
      return
    }

    try {
      await deleteRetentionVariation(variation.id)
      toast({
        title: "Success",
        description: "Variation deleted successfully",
      })
      await fetchVariations()
    } catch (error) {
      console.error("Failed to delete variation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete variation",
        variant: "destructive",
      })
    }
  }

  // Handle variation image change
  const handleVariationImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setVariationFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: reader.result as string,
        }))
      }
      reader.readAsDataURL(file)
    }
    // Clear the input value to allow re-selecting the same file
    if (variationFileInputRef.current) {
      variationFileInputRef.current.value = ""
    }
  }

  // Handle toggle variation status
  const handleToggleVariationStatus = (variation: RetentionVariation) => {
    const newStatus = variation.status === "Active" ? "Inactive" : "Active"
    handleUpdateVariation(variation, { status: newStatus })
  }

  // Handle set default variation
  const handleSetDefaultVariation = async (variation: RetentionVariation) => {
    try {
      await handleUpdateVariation(variation, { is_default: "Yes" })
      // Optionally set all other variations to "No" if needed
      // The backend might handle this automatically
    } catch (error) {
      console.error("Failed to set default variation:", error)
    }
  }

  // Open create variation modal
  const handleOpenCreateVariation = () => {
    if (!retention?.id) {
      toast({
        title: "Info",
        description: "Please save the retention first before adding variations",
        variant: "default",
      })
      return
    }
    setEditingVariation(null)
    setVariationFormData({
      name: "",
      image: null,
      imagePreview: null,
      status: "Active",
      is_default: "No",
    })
    setShowVariationModal(true)
  }

  const handleDiscard = () => {
    setRetentionName("")
    setRetentionCode("")
    setPrice("")
    setAdditionalPrice("")
    setPriceOption("no-price")
    setDetailsEnabled(true)
    setLinkToProductsExpanded(false)
    setImageVariationsOpen(false)
    setShowDiscardDialog(false)
    setHasChanges(false)
    setErrors({})
    onClose()
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      let priceValue = 0
      if (isLabAdmin) {
        priceValue = price.trim() !== "" && !isNaN(Number(price)) ? parseFloat(price) : 0
      }

      const payload: any = {
        name: retentionName.trim(),
        code: retentionCode.trim(),
        sequence: 1,
        status: "Active",
        price: priceValue,
        ...(isLabAdmin && customerId ? { customer_id: customerId } : {})
      }

      let success = false
      // If copying, always create a new retention (not update)
      if (retention && retention.id && !isCopying) {
        success = await updateRetention(retention.id, payload)
      } else {
        // Create new retention (either new or copy)
        success = await createRetention(payload)
      }

      if (success) {
        setRetentionName("")
        setRetentionCode("")
        setPrice("")
        setAdditionalPrice("")
        setPriceOption("no-price")
        setDetailsEnabled(true)
        setLinkToProductsExpanded(false)
        setImageVariationsOpen(false)
        setHasChanges(false)
        setErrors({})
        onClose()
      }
    } catch (error) {
      console.error("Error creating/updating retention:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSaveDisabled = !retentionName.trim() || !retentionCode.trim() || (isLabAdmin && !price.trim()) || isSubmitting

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-white rounded-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {isCopying ? "Copy Retention Mechanism" : retention && retention.id ? "Edit Retention Mechanism" : "Create New Retention Mechanism"}
            </DialogTitle>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Retention Mechanism Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Retention Mechanism Details</Label>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <Switch
                  className="data-[state=checked]:bg-[#1162a8]"
                  checked={detailsEnabled}
                  onCheckedChange={setDetailsEnabled}
                />
              </div>

              {detailsEnabled && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="retentionName" className="text-sm font-medium">
                      Retention Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="retentionName"
                      placeholder="Enter retention name"
                      value={retentionName}
                      onChange={(e) => {
                        const newName = e.target.value
                        setRetentionName(newName)
                        // Auto-generate code from name
                        const generatedCode = generateCodeFromName(newName)
                        if (generatedCode) {
                          setRetentionCode(generatedCode)
                        }
                      }}
                      className={`w-full mt-1 ${errors.retentionName ? "border-red-500" : ""}`}
                      validationState={errors.retentionName ? "error" : (retentionName.trim() ? "valid" : "default")}
                    />
                    {errors.retentionName && <p className="text-red-500 text-sm mt-1">{errors.retentionName}</p>}
                  </div>

                  <div>
                    <Label htmlFor="retentionCode" className="text-sm font-medium">
                      Retention Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="retentionCode"
                      placeholder="Enter retention code"
                      value={retentionCode}
                      onChange={(e) => setRetentionCode(e.target.value)}
                      className={`w-full mt-1 ${errors.retentionCode ? "border-red-500" : ""}`}
                      validationState={errors.retentionCode ? "error" : (retentionCode.trim() ? "valid" : "default")}
                    />
                    {errors.retentionCode && <p className="text-red-500 text-sm mt-1">{errors.retentionCode}</p>}
                  </div>

                  <div className="space-y-3">
                    {/* For lab_admin, show price input directly. Otherwise, show radio group */}
                    {isLabAdmin ? (
                      <div className="ml-0">
                        <div>
                          <Label htmlFor="price" className="text-sm font-medium">
                            Price <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              className={`pl-8 ${errors.price ? "border-red-500" : ""}`}
                              validationState={errors.price ? "error" : (price.trim() ? "valid" : "default")}
                            />
                          </div>
                          {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                        </div>
                      </div>
                    ) : (
                      <RadioGroup value={priceOption} onValueChange={setPriceOption}>
                        {/* <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no-price" id="no-price" />
                          <Label htmlFor="no-price">No additional price</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="with-price" id="with-price" />
                          <Label htmlFor="with-price">Add price</Label>
                        </div>
                        {priceOption === "with-price" && (
                          <div className="ml-6">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className={`pl-8 ${errors.price ? "border-red-500" : ""}`}
                              />
                            </div>
                            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                          </div>
                        )} */}
                      </RadioGroup>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Image Variations Section */}
            <Collapsible open={imageVariationsOpen} onOpenChange={setImageVariationsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Image Variations</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-4 bg-white border border-gray-200 shadow-lg rounded-md">
                        <p className="text-sm text-gray-600">
                          Manage different image variations for this retention.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${imageVariationsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                      onClick={handleOpenCreateVariation}
                      disabled={!retention?.id}
                    >
                      + New variation
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 mb-3">
                      <div className="col-span-1">Image</div>
                      <div className="col-span-5">Name</div>
                      <div className="col-span-2">Active</div>
                      <div className="col-span-3">Default</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    {/* Variations list */}
                    {isLoadingVariations ? (
                      <div className="text-center py-8 text-gray-500">Loading variations...</div>
                    ) : variations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No variations yet. Click "+ New variation" to add one.</div>
                    ) : (
                      <div className="space-y-3">
                        {variations.map((variation) => (
                          <div
                            key={variation.id}
                            className={`grid grid-cols-12 gap-4 items-center py-3 px-4 border rounded-lg ${
                              variation.is_default === "Yes" ? "bg-blue-50 border-blue-200" : "bg-white"
                            }`}
                          >
                            <div className="col-span-1">
                              {variation.image_url ? (
                                <img
                                  src={variation.image_url}
                                  alt={variation.name}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="col-span-5">
                              <span className="text-sm font-medium">{variation.name}</span>
                            </div>
                            <div className="col-span-2">
                              <Switch
                                checked={variation.status === "Active"}
                                onCheckedChange={() => handleToggleVariationStatus(variation)}
                                className="data-[state=checked]:bg-[#1162a8]"
                              />
                            </div>
                            <div className="col-span-3">
                              {variation.is_default === "Yes" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-default"
                                  disabled
                                >
                                  Default Image
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                                  onClick={() => handleSetDefaultVariation(variation)}
                                >
                                  Set as default image
                                </Button>
                              )}
                            </div>
                            <div className="col-span-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteVariation(variation)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="bg-[#1162a8] hover:bg-[#0f5496] disabled:opacity-50"
            >
              {isSubmitting 
                ? (isCopying ? "Copying..." : "Saving...") 
                : (isCopying ? "Copy Retention" : "Save Retention")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Variation Modal */}
      <Dialog open={showVariationModal} onOpenChange={setShowVariationModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingVariation ? "Edit Variation" : "Create New Variation"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="variationName">Name *</Label>
              <Input
                id="variationName"
                placeholder="e.g., Clasp"
                value={variationFormData.name}
                onChange={(e) => setVariationFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-10"
              />
            </div>

            <div>
              <Label htmlFor="variationImage">Image *</Label>
              <div className="flex flex-col gap-3">
                <div
                  className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 h-[140px] bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer group"
                  onClick={() => variationFileInputRef.current?.click()}
                >
                  {variationFormData.imagePreview ? (
                    <img
                      src={variationFormData.imagePreview}
                      alt="Preview"
                      className="object-cover h-full w-full rounded-xl"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-600">
                      <i className="fas fa-cloud-upload-alt text-3xl mb-2"></i>
                      <span className="text-xs font-medium">Upload Image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={variationFileInputRef}
                    style={{ display: "none" }}
                    onChange={handleVariationImageChange}
                  />
                </div>
                {variationFormData.image && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setVariationFormData(prev => ({ ...prev, image: null, imagePreview: null }))}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove Image
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="variationStatus">Status</Label>
                <Select
                  value={variationFormData.status}
                  onValueChange={(value: "Active" | "Inactive") => 
                    setVariationFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger id="variationStatus" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="variationDefault">Set as Default</Label>
                <Select
                  value={variationFormData.is_default}
                  onValueChange={(value: "Yes" | "No") => 
                    setVariationFormData(prev => ({ ...prev, is_default: value }))
                  }
                >
                  <SelectTrigger id="variationDefault" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => {
              setShowVariationModal(false)
              setVariationFormData({
                name: "",
                image: null,
                imagePreview: null,
                status: "Active",
                is_default: "No",
              })
              setEditingVariation(null)
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateVariation}
              disabled={!variationFormData.name.trim() || !variationFormData.image}
              className="bg-[#1162a8] hover:bg-[#0d4d87]"
            >
              {editingVariation ? "Update Variation" : "Create Variation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Products Modal */}
      <LinkProductsModal
        isOpen={showLinkProductsModal}
        onClose={() => setShowLinkProductsModal(false)}
        entityType="retention"
        context="lab"
        onApply={() => {
          setShowLinkProductsModal(false)
          toast({
            title: "Success",
            description: "Products linked successfully",
          })
        }}
      />

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="retention"
        onDiscard={handleDiscard}
        onKeepEditing={() => setShowDiscardDialog(false)}
      />
    </>
  )
}
