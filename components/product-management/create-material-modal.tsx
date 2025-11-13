"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronRight, X, Info, Trash2 } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useMaterials } from "@/contexts/product-materials-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generateCodeFromName } from "@/lib/utils"
import {
  getMaterialVariations,
  createMaterialVariation,
  updateMaterialVariation,
  deleteMaterialVariation,
  fileToBase64,
  type MaterialVariation,
} from "@/services/material-variations-api"
import { LinkProductsModal } from "./link-products-modal"
import { useToast } from "@/hooks/use-toast"

interface CreateMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  material?: any // Add material prop for editing
}

export function CreateMaterialModal({ isOpen, onClose, material }: CreateMaterialModalProps) {
  const { createMaterial, updateMaterial, isLoading, user, getMaterialDetail } = useMaterials()
  const userRole = user?.roles?.[0] || user?.role || "user"
  const isLabAdmin = userRole === "lab_admin"

  const [materialName, setMaterialName] = useState("")
  const [materialCode, setMaterialCode] = useState("")
  const [additionalPrice, setAdditionalPrice] = useState("")
  const [priceOption, setPriceOption] = useState("no-additional")
  const [status, setStatus] = useState("Active")
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToGroupOpen, setLinkToGroupOpen] = useState(false)
  const [imageVariationsOpen, setImageVariationsOpen] = useState(false)
  const [showLinkProductsModal, setShowLinkProductsModal] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Image Variations state management
  const [variations, setVariations] = useState<MaterialVariation[]>([])
  const [isLoadingVariations, setIsLoadingVariations] = useState(false)
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [editingVariation, setEditingVariation] = useState<MaterialVariation | null>(null)
  const [variationFormData, setVariationFormData] = useState({
    name: "",
    image: null as File | null,
    imagePreview: null as string | null,
    status: "Active" as "Active" | "Inactive",
    is_default: "No" as "Yes" | "No",
  })
  const variationFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Log user role detection
  useEffect(() => {
    console.log("=== User Role Detection ===")
    console.log("User object:", user)
    console.log("User roles array:", user?.roles)
    console.log("User role (single):", user?.role)
    console.log("Calculated userRole:", userRole)
    console.log("isLabAdmin:", isLabAdmin)
    console.log("===========================")
  }, [user, userRole, isLabAdmin])

  // Log when additionalPrice changes
  useEffect(() => {
    console.log("💵 additionalPrice state changed:", additionalPrice, "type:", typeof additionalPrice)
  }, [additionalPrice])

  // Fetch material variations
  const fetchVariations = useCallback(async () => {
    if (!material?.id) return
    
    setIsLoadingVariations(true)
    try {
      const response = await getMaterialVariations({ material_id: material.id, per_page: 100 })
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
  }, [material?.id, toast])

  // Fetch variations when material is set (edit mode) or when variations section is opened
  useEffect(() => {
    if (isOpen && imageVariationsOpen && material?.id) {
      fetchVariations()
    }
  }, [isOpen, imageVariationsOpen, material?.id, fetchVariations])

  // Prefill state if editing, fetch latest detail if material.id exists
  useEffect(() => {
    let ignore = false
    async function fetchDetailAndSet() {
      if (material && material.id) {
        const detail = await getMaterialDetail(material.id)
        if (ignore) return
        const mat = detail || material
        
        // Extract price - check multiple possible locations
        let priceValue = 0
        if (typeof mat.price === "number") {
          priceValue = mat.price
        } else if (mat.lab_material?.price) {
          priceValue = typeof mat.lab_material.price === "number" 
            ? mat.lab_material.price 
            : parseFloat(mat.lab_material.price) || 0
        } else if (typeof mat.price === "string") {
          priceValue = parseFloat(mat.price) || 0
        }
        
        console.log("Loading material for edit - mat:", mat)
        console.log("Loading material for edit - extracted price:", priceValue)
        
        setMaterialName(mat.name || "")
        setMaterialCode(mat.code || "")
        setAdditionalPrice(priceValue > 0 ? priceValue.toString() : "")
        setPriceOption(priceValue > 0 ? "additional" : "no-additional")
        setStatus(mat.status || "Active")
        setHasChanges(false)
        setErrors({})
      } else if (material) {
        // Extract price for copied material (material without id)
        let priceValue = 0
        if (typeof material.price === "number") {
          priceValue = material.price
        } else if (material.lab_material?.price) {
          priceValue = typeof material.lab_material.price === "number" 
            ? material.lab_material.price 
            : parseFloat(material.lab_material.price) || 0
        } else if (typeof material.price === "string") {
          priceValue = parseFloat(material.price) || 0
        }
        
        setMaterialName(material.name || "")
        setMaterialCode(material.code || "")
        setAdditionalPrice(priceValue > 0 ? priceValue.toString() : "")
        setPriceOption(priceValue > 0 ? "additional" : "no-additional")
        setStatus(material.status || "Active")
        setHasChanges(false)
        setErrors({})
      } else {
        setMaterialName("")
        setMaterialCode("")
        setAdditionalPrice("")
        setPriceOption("no-additional")
        setStatus("Active")
        setHasChanges(false)
        setErrors({})
      }
    }
    if (isOpen) {
      fetchDetailAndSet()
    }
    return () => { ignore = true }
  }, [material, isOpen, getMaterialDetail])

  const handleInputChange = (value: string, setter: (value: string) => void) => {
    setter(value)
    setHasChanges(true)
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
    if (!material?.id) {
      toast({
        title: "Error",
        description: "Material ID is required. Please save the material first.",
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
        material_id: material.id,
        name: variationFormData.name.trim(),
        image: imageBase64,
        status: variationFormData.status,
        is_default: variationFormData.is_default,
      }

      await createMaterialVariation(payload)
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
  const handleUpdateVariation = async (variation: MaterialVariation, updates: any) => {
    try {
      await updateMaterialVariation(variation.id, updates)
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
  const handleDeleteVariation = async (variation: MaterialVariation) => {
    if (!confirm(`Are you sure you want to delete "${variation.name}"?`)) {
      return
    }

    try {
      await deleteMaterialVariation(variation.id)
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
  const handleToggleVariationStatus = (variation: MaterialVariation) => {
    const newStatus = variation.status === "Active" ? "Inactive" : "Active"
    handleUpdateVariation(variation, { status: newStatus })
  }

  // Open create variation modal
  const handleOpenCreateVariation = () => {
    if (!material?.id) {
      toast({
        title: "Info",
        description: "Please save the material first before adding variations",
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
    setMaterialName("")
    setMaterialCode("")
    setAdditionalPrice("")
    setPriceOption("no-additional")
    setStatus("Active")
    setLinkToProductsOpen(false)
    setLinkToGroupOpen(false)
    setImageVariationsOpen(false)
    setHasChanges(false)
    setErrors({})
    setShowDiscardDialog(false)
    onClose()
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!materialName.trim()) {
      newErrors.materialName = "Material name is required"
    }

    // Price validation for lab_admin
    if (isLabAdmin && priceOption === "additional") {
      if (!additionalPrice.trim()) {
        newErrors.price = "Price is required"
      } else if (isNaN(Number(additionalPrice)) || Number(additionalPrice) < 0) {
        newErrors.price = "Price must be a non-negative number"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Determine if we're copying (material exists but no id, or name/code indicates copy)
  const isCopying = material && !material.id && (
    materialName.includes("(Copy)") || 
    materialCode.includes("_COPY_") || 
    material?.name?.includes("(Copy)") || 
    material?.code?.includes("_COPY_")
  )

  const handleSave = async () => {
    // Use both console.log and alert to ensure visibility
    console.log("🚀 handleSave called!")
    window.console.log("🚀 handleSave called! (window.console)")
    
    console.log("User object:", user)
    console.log("User roles:", user?.roles)
    console.log("User role (single):", user?.role)
    
    // Function called - logs will show below
    
    if (!validateForm()) {
      console.log("❌ Form validation failed")
      return
    }

    try {
      // Debug: Log current state values
      console.log("=== Material Save Debug ===")
      console.log("materialName:", materialName)
      console.log("materialCode:", materialCode)
      console.log("additionalPrice:", additionalPrice)
      console.log("additionalPrice type:", typeof additionalPrice)
      console.log("userRole:", userRole)
      console.log("isLabAdmin:", isLabAdmin)
      
      const payload: any = {
        name: materialName.trim(),
        code: materialCode.trim() || undefined,
        sequence: 1,
        status: status,
      }
      
      // Handle price - only include it for lab admins (lab profile)
      // According to API spec: price should only be included when executed with lab profile
      console.log("🔍 Checking isLabAdmin:", isLabAdmin)
      
      if (isLabAdmin) {
        console.log("✅ User is lab admin - processing price")
        // For lab admins, always include price in the payload
        // Convert to number - handle string, number, empty, null, undefined
        let priceValue = 0
        
        console.log("💰 additionalPrice raw value:", additionalPrice)
        console.log("💰 additionalPrice type:", typeof additionalPrice)
        
        // More explicit check - handle all cases
        if (additionalPrice !== null && additionalPrice !== undefined) {
          // Convert to string first to handle number inputs
          const priceStr = String(additionalPrice).trim()
          console.log("💰 priceStr after String() and trim():", priceStr)
          console.log("💰 priceStr length:", priceStr.length)
          console.log("💰 priceStr === '':", priceStr === "")
          
          // Check if string is not empty
          if (priceStr.length > 0) {
            // Try to parse as float (handles decimals like 150.50)
            const parsed = parseFloat(priceStr)
            console.log("💰 parseFloat result:", parsed)
            console.log("💰 isNaN(parsed):", isNaN(parsed))
            console.log("💰 isFinite(parsed):", isFinite(parsed))
            console.log("💰 parsed >= 0:", parsed >= 0)
            
            // Validate: must be a valid number and non-negative
            if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
              priceValue = parsed
              console.log("✅ Valid price, setting priceValue to:", priceValue)
            } else {
              console.log("❌ Invalid price - isNaN:", isNaN(parsed), "isFinite:", isFinite(parsed), "parsed:", parsed)
            }
          } else {
            console.log("❌ priceStr is empty (length is 0)")
          }
        } else {
          console.log("❌ additionalPrice is null or undefined")
        }
        
        // Always include price for lab admins (even if 0, as per API spec)
        payload.price = priceValue
        console.log("=== Price Calculation Result ===")
        console.log("additionalPrice input:", additionalPrice)
        console.log("priceValue calculated:", priceValue)
        console.log("Final payload.price:", payload.price)
      } else {
        console.log("❌ User is NOT lab admin - skipping price field")
        console.log("User role was:", userRole)
        console.log("User roles array:", user?.roles)
        console.log("User object:", user)
        // Still include price as 0 for non-lab admins? Or don't include it?
        // According to spec, price should only be included for lab profile
      }
      
      // Debug logging - always show
      console.log("=========================================")
      console.log("📦 FINAL PAYLOAD BEING SENT:")
      console.log("=========================================")
      console.log(JSON.stringify(payload, null, 2))
      console.log("=========================================")
      console.log("Payload object:", payload)
      console.log("Payload price value:", payload.price)
      console.log("Payload price type:", typeof payload.price)
      console.log("Is updating?", material && material.id)
      console.log("=========================================")

      if (material && material.id) {
        console.log("🔄 Calling updateMaterial with payload:", payload)
        await updateMaterial(material.id, payload)
      } else {
        console.log("➕ Calling createMaterial with payload:", payload)
        await createMaterial(payload)
      }

      // Reset form and errors
      setMaterialName("")
      setMaterialCode("")
      setAdditionalPrice("")
      setPriceOption("no-additional")
      setStatus("Active")
      setLinkToProductsOpen(false)
      setLinkToGroupOpen(false)
      setImageVariationsOpen(false)
      setHasChanges(false)
      setErrors({})
      onClose()
    } catch (error) {
      console.error("❌ Error creating/updating material:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      alert("Error saving material. Check console for details.")
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-[700px] p-0 gap-0 overflow-hidden bg-white rounded-md">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
              <DialogTitle className="text-base sm:text-xl font-bold">
                {isCopying ? "Copy Material" : material && material.id ? "Edit Material" : "Create new Material"}
              </DialogTitle>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
            {/* Material Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Material Details</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="ml-1 h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-4 bg-white border border-gray-200 shadow-lg rounded-md">
                      <p className="text-sm text-gray-600">
                      Material help organize material into logical sets for easier management and
                        assignment to products.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="materialName" className="text-sm font-medium text-gray-700">
                    Material Name *
                  </Label>
                  <Input
                    id="materialName"
                    placeholder="Material Name"
                    value={materialName}
                    onChange={(e) => {
                      const newName = e.target.value
                      handleInputChange(newName, setMaterialName)
                      // Auto-generate code from name
                      const generatedCode = generateCodeFromName(newName)
                      if (generatedCode) {
                        handleInputChange(generatedCode, setMaterialCode)
                      }
                      if (errors.materialName) {
                        setErrors((prev) => ({ ...prev, materialName: "" }))
                      }
                    }}
                    className={`mt-1 ${errors.materialName ? "border-red-500" : ""}`}
                    required
                  />
                  {errors.materialName && <p className="text-red-500 text-sm mt-1">{errors.materialName}</p>}
                </div>

                <div>
                  <Label htmlFor="materialCode" className="text-sm font-medium text-gray-700">
                    Material Code
                  </Label>
                  <Input
                    id="materialCode"
                    placeholder="Material Code"
                    value={materialCode}
                    onChange={(e) => handleInputChange(e.target.value, setMaterialCode)}
                    className="mt-1"
                  />
                </div>

                <div className="space-y-3">
                  {isLabAdmin ? (
                    <>
                      <Label htmlFor="additionalPrice" className="text-sm font-medium text-gray-700">
                        Price
                      </Label>
                      <Input
                        id="additionalPrice"
                        placeholder="Price"
                        value={additionalPrice}
                        onChange={(e) => {
                          const value = e.target.value
                          setAdditionalPrice(value)
                          setHasChanges(true)
                        }}
                        className="w-32"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                      {errors.price && (
                        <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                      )}
                    </>
                  ) : (
                    <RadioGroup
                      value={priceOption}
                      onValueChange={(value) => {
                        setPriceOption(value)
                        setHasChanges(true)
                      }}
                    >
                      {/* <div className="flex items-center space-x-2">
                        <RadioGroupItem value="additional" id="additional" />
                        <Label htmlFor="additional" className="text-sm">
                          <Input
                            placeholder="Add-on Price"
                            value={additionalPrice}
                            onChange={(e) => handleInputChange(e.target.value, setAdditionalPrice)}
                            className="w-32 inline-block ml-2"
                            disabled={priceOption !== "additional"}
                          />
                        </Label>
                      </div>
                      {priceOption === "additional" && errors.price && (
                        <p className="text-red-500 text-sm mt-1 ml-8">{errors.price}</p>
                      )}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no-additional" id="no-additional" />
                        <Label htmlFor="no-additional" className="text-sm">
                          No additional price
                        </Label>
                      </div> */}
                    </RadioGroup>
                  )}
                </div>

                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                    Status *
                  </Label>
                  <Select 
                    value={status} 
                    onValueChange={(value) => {
                      setStatus(value)
                      setHasChanges(true)
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                          Manage different image variations for this material.
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
                      disabled={!material?.id}
                    >
                      + New variation
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 mb-3">
                      <div className="col-span-1">Image</div>
                      <div className="col-span-8">Name</div>
                      <div className="col-span-2">Active</div>
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
                            <div className="col-span-8">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{variation.name}</span>
                                {variation.is_default === "Yes" && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Default</span>
                                )}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <Switch
                                checked={variation.status === "Active"}
                                onCheckedChange={() => handleToggleVariationStatus(variation)}
                                className="data-[state=checked]:bg-[#1162a8]"
                              />
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

          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t">
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#1162a8] hover:bg-[#0d4d87] w-full sm:w-auto"
              disabled={isLoading || !materialName.trim()}
            >
              {isLoading 
                ? (isCopying ? "Saving Copy..." : material && material.id ? "Saving..." : "Creating...") 
                : (isCopying ? "Save Copy" : material && material.id ? "Save Changes" : "Save Material")}
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
                placeholder="e.g., Porcelain"
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
        entityType="material"
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
        type="material"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
