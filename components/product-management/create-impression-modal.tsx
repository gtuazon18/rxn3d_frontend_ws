"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, ChevronDown, Info, Upload, Image as ImageIcon, Trash2 } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useImpressions, Impression } from "@/contexts/product-impression-context"
import { DialogTitle } from "@radix-ui/react-dialog"
import { getAuthToken } from "@/lib/auth-utils"

interface CreateImpressionModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
  impression?: Impression | null
  mode?: "create" | "edit"
}

export function CreateImpressionModal({ isOpen, onClose, onChanges, impression, mode = "create" }: CreateImpressionModalProps) {
  const { createImpression, updateImpression, isLoading } = useImpressions()
  const [impressionDetailsEnabled, setImpressionDetailsEnabled] = useState(true)
  const [impressionName, setImpressionName] = useState("")
  const [impressionCode, setImpressionCode] = useState("")
  const [impressionUrl, setImpressionUrl] = useState("")
  const [showOpposingWarning, setShowOpposingWarning] = useState("yes")
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToGroupOpen, setLinkToGroupOpen] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate next available impression code starting with IM
  const generateNextImpressionCode = useCallback(async (): Promise<string> => {
    try {
      const token = getAuthToken()
      const customerId = localStorage.getItem("customerId")
      
      // Fetch impressions to find the highest IM code
      const params = new URLSearchParams({
        per_page: "1000",
      })
      if (customerId) {
        params.append("customer_id", customerId)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/impressions?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        // If fetch fails, start with IM0001
        return "IM0001"
      }

      const result = await response.json()
      const allImpressions = result.data?.data || result.data || []

      // Extract all numeric parts from existing codes that start with "IM"
      const existingCodes = allImpressions
        .map((i: Impression) => i.code)
        .filter((code: string) => code && code.toUpperCase().startsWith("IM"))
        .map((code: string) => {
          // Extract numeric part after "IM"
          const match = code.toUpperCase().match(/^IM(\d+)$/)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter((num: number) => num > 0)

      // Find the highest number
      const maxNumber = existingCodes.length > 0 ? Math.max(...existingCodes) : 0

      // Generate next number (pad with zeros to 4 digits)
      const nextNumber = maxNumber + 1
      return `IM${nextNumber.toString().padStart(4, "0")}`
    } catch (error) {
      console.error("Failed to generate impression code:", error)
      // Fallback to IM0001 if there's an error
      return "IM0001"
    }
  }, [])

  // Track changes
  useEffect(() => {
    const hasChanges = impressionName.trim() !== "" || impressionCode.trim() !== "" || impressionUrl.trim() !== "" || selectedImage !== null
    onChanges(hasChanges)
  }, [impressionName, impressionCode, impressionUrl, selectedImage, onChanges])

  // Reset form when modal opens or impression changes
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && impression) {
        setImpressionName(impression.name || "")
        setImpressionCode(impression.code || "")
        setImpressionUrl(impression.url || "")
        setSelectedImage(impression.image_url || null)
        setImpressionDetailsEnabled(true)
        setShowOpposingWarning(impression.is_digital_impression?.toLowerCase() === "yes" ? "yes" : "no")
      } else {
        // Generate auto code for new impression
        generateNextImpressionCode().then((autoCode) => {
          setImpressionCode(autoCode)
        })
        setImpressionName("")
        setImpressionUrl("")
        setSelectedImage(null)
        setImpressionDetailsEnabled(true)
        setShowOpposingWarning("yes")
      }
      setImageFile(null)
      setLinkToProductsOpen(false)
      setLinkToGroupOpen(false)
      setErrors({})
    }
  }, [isOpen, impression, mode, generateNextImpressionCode])

  // Image validation
  const validateImage = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    
    if (file.size > maxSize) {
      return "Image size must be less than 5MB"
    }
    
    if (!allowedTypes.includes(file.type)) {
      return "Only JPEG, PNG, GIF, and WebP images are allowed"
    }
    
    return null
  }

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    const validationError = validateImage(file)
    if (validationError) {
      setErrors(prev => ({ ...prev, image: validationError }))
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setSelectedImage(base64)
      setImageFile(file)
      setErrors(prev => ({ ...prev, image: "" }))
    } catch (error) {
      setErrors(prev => ({ ...prev, image: "Failed to process image" }))
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!impressionName.trim()) {
      newErrors.impressionName = "Impression name is required"
    }

    if (!impressionCode.trim()) {
      newErrors.impressionCode = "Impression code is required"
    }

    // URL validation - required for create, optional for edit
    if (mode === "create" && !impressionUrl.trim()) {
      newErrors.impressionUrl = "URL is required"
    } else if (impressionUrl.trim()) {
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
      if (!urlPattern.test(impressionUrl.trim())) {
        newErrors.impressionUrl = "Please enter a valid URL"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    const payload = {
      name: impressionName.trim(),
      code: impressionCode.trim(),
      sequence: 1,
      url: impressionUrl.trim() || undefined,
      image: selectedImage || undefined,
      is_digital_impression: showOpposingWarning === "yes" ? "Yes" : "No",
      status: "Active",
    }

    try {
      if (mode === "edit" && impression) {
        await updateImpression(impression.id, payload)
      } else {
        await createImpression(payload)
      }
      // Reset form and errors
      setImpressionName("")
      setImpressionCode("")
      setImpressionUrl("")
      setSelectedImage(null)
      setImageFile(null)
      setErrors({})
      onClose()
    } catch (error) {
      console.error("Error saving impression:", error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 w-[95vw] max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden bg-white rounded-md">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <DialogTitle className="text-lg font-bold">
            {mode === "edit" ? "Edit Impression" : "Create Impression"}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Impression Details Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Impression Details</span>
              <div className="rounded-full bg-gray-200 text-gray-600 w-5 h-5 flex items-center justify-center text-xs">
                ?
              </div>
            </div>
            <Switch
              checked={impressionDetailsEnabled}
              onCheckedChange={setImpressionDetailsEnabled}
              className="data-[state=checked]:bg-[#1162a8]"
            />
          </div>

          {impressionDetailsEnabled && (
            <div className="space-y-3">
              <div>
                <Input
                  placeholder="Impression Name *"
                  className={`h-10 ${errors.impressionName ? "border-red-500" : ""}`}
                  value={impressionName}
                  onChange={(e) => {
                    setImpressionName(e.target.value)
                    if (errors.impressionName) {
                      setErrors((prev) => ({ ...prev, impressionName: "" }))
                    }
                  }}
                  required
                />
                {errors.impressionName && <p className="text-red-500 text-xs mt-1">{errors.impressionName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Input
                    placeholder="Code *"
                    className={`h-10 ${errors.impressionCode ? "border-red-500" : ""}`}
                    value={impressionCode}
                    onChange={(e) => {
                      setImpressionCode(e.target.value)
                      if (errors.impressionCode) {
                        setErrors((prev) => ({ ...prev, impressionCode: "" }))
                      }
                    }}
                    required
                  />
                  {errors.impressionCode && <p className="text-red-500 text-xs mt-1">{errors.impressionCode}</p>}
                </div>
                <div>
                  <Input
                    placeholder={mode === "create" ? "URL *" : "URL"}
                    className={`h-10 ${errors.impressionUrl ? "border-red-500" : ""}`}
                    value={impressionUrl}
                    onChange={(e) => {
                      setImpressionUrl(e.target.value)
                      if (errors.impressionUrl) {
                        setErrors((prev) => ({ ...prev, impressionUrl: "" }))
                      }
                    }}
                    required={mode === "create"}
                  />
                  {errors.impressionUrl && <p className="text-red-500 text-xs mt-1">{errors.impressionUrl}</p>}
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="mt-3">
                <p className="mb-2 text-sm font-medium">Impression Image</p>
                {selectedImage ? (
                  <div className="relative">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3">
                      <img
                        src={selectedImage}
                        alt="Selected impression"
                        className="w-full h-32 object-contain rounded"
                      />
                      <div className="absolute top-1 right-1">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeImage}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {imageFile?.name} ({(imageFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      isDragOver
                        ? "border-[#1162a8] bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs text-gray-600 mb-1">
                      Drag and drop an image here, or click to select
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF, WebP up to 5MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
              </div>

              <div className="mt-3">
                <p className="mb-2 text-sm font-medium">Show opposing warning scan?</p>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        showOpposingWarning === "yes" ? "border-[#1162a8]" : "border-gray-300"
                      } flex items-center justify-center cursor-pointer`}
                      onClick={() => setShowOpposingWarning("yes")}
                    >
                      {showOpposingWarning === "yes" && <div className="w-2 h-2 rounded-full bg-[#1162a8]"></div>}
                    </div>
                    <span className="ml-2 text-sm">Yes</span>
                  </div>

                  <div className="flex items-center">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        showOpposingWarning === "no" ? "border-[#1162a8]" : "border-gray-300"
                      } flex items-center justify-center cursor-pointer`}
                      onClick={() => setShowOpposingWarning("no")}
                    >
                      {showOpposingWarning === "no" && <div className="w-2 h-2 rounded-full bg-[#1162a8]"></div>}
                    </div>
                    <span className="ml-2 text-sm">No</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Link to Products Section */}
          <Collapsible open={linkToProductsOpen} onOpenChange={setLinkToProductsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Link to Products</span>
                <div className="rounded-full bg-gray-200 text-gray-600 w-4 h-4 flex items-center justify-center text-xs">
                  ?
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${linkToProductsOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <p className="text-gray-600 text-sm mb-3">Select products to link this impression to.</p>
              {/* Product linking content would go here */}
            </CollapsibleContent>
          </Collapsible>

          {/* Link to Existing Group Section */}
          <Collapsible open={linkToGroupOpen} onOpenChange={setLinkToGroupOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Link to Existing Group</span>
                <div className="rounded-full bg-gray-200 text-gray-600 w-4 h-4 flex items-center justify-center text-xs">
                  ?
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${linkToGroupOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <p className="text-gray-600 text-sm mb-3">Select groups to link this impression to.</p>
              {/* Group linking content would go here */}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Footer with action buttons */}
        <div className="px-4 py-3 flex justify-end gap-2 border-t flex-shrink-0 bg-white">
          <Button variant="destructive" onClick={onClose} className="bg-red-600 hover:bg-red-700 h-9 px-4">
            Cancel
          </Button>
          <Button
            className="bg-[#1162a8] h-9 px-4"
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !impressionName.trim() ||
              !impressionCode.trim() ||
              (mode === "create" && !impressionUrl.trim()) ||
              !!errors.impressionUrl ||
              !!errors.image
            }
          >
            {isLoading
              ? (mode === "edit" ? "Saving..." : "Saving...")
              : (mode === "edit" ? "Save Changes" : "Save Impression")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
