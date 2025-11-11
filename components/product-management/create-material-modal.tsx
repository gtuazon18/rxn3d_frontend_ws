"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, X, Info } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useMaterials } from "@/contexts/product-materials-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"

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
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToGroupOpen, setLinkToGroupOpen] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

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
        setHasChanges(false)
        setErrors({})
      } else {
        setMaterialName("")
        setMaterialCode("")
        setAdditionalPrice("")
        setPriceOption("no-additional")
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

  const handleDiscard = () => {
    setMaterialName("")
    setMaterialCode("")
    setAdditionalPrice("")
    setPriceOption("no-additional")
    setLinkToProductsOpen(false)
    setLinkToGroupOpen(false)
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
        status: "Active",
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
      setLinkToProductsOpen(false)
      setLinkToGroupOpen(false)
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
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-white rounded-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
              <DialogTitle className="text-xl font-bold">
                {isCopying ? "Copy Material" : material && material.id ? "Edit Material" : "Create new Material"}
              </DialogTitle>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

          <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
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
                      handleInputChange(e.target.value, setMaterialName)
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
              </div>
            </div>
         
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#1162a8] hover:bg-[#0d4d87]"
              disabled={isLoading || !materialName.trim()}
            >
              {isLoading 
                ? (isCopying ? "Saving Copy..." : material && material.id ? "Saving..." : "Creating...") 
                : (isCopying ? "Save Copy" : material && material.id ? "Save Changes" : "Save Material")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="material"
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}
