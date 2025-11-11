import React, { useRef, useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Controller, useWatch } from "react-hook-form"
import { ValidationError } from "@/components/ui/validation-error"
import { Info, AlertCircle } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ProductDetailsSectionProps = {
  control: any
  register: any
  sections: any
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  currentParentDropdownCategories: Array<{ id: number; name: string }>
  editingProduct?: any
  onImageChange?: (base64: string | null) => void
  userRole?: string
  setValue?: (name: string, value: any) => void
}

export function ProductDetailsSection({
  control,
  register,
  sections,
  toggleSection,
  getValidationError,
  currentParentDropdownCategories,
  editingProduct,
  onImageChange,
  userRole = "", // <-- default to empty string if undefined
  setValue,
}: ProductDetailsSectionProps) {
  const grades = useWatch({ control, name: "grades" }) || []
  const defaultGrade = grades.find((g: any) => g.is_default === "Yes")
  const defaultGradePrice =
    defaultGrade && defaultGrade.price !== undefined && defaultGrade.price !== null && defaultGrade.price !== ""
      ? String(defaultGrade.price)
      : ""
  
  const isCustomDisabled = userRole !== "superadmin" && editingProduct?.is_custom === "No"

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Initialize image preview with existing image when editing
  useEffect(() => {
    if (editingProduct?.image_url) {
      setImagePreview(editingProduct.image_url)
    }
  }, [editingProduct?.image_url])

  // Update base_price when default grade price changes
  useEffect(() => {
    if (sections.grades && defaultGradePrice && setValue) {
      setValue("base_price", defaultGradePrice, { shouldDirty: true, shouldValidate: true })
    }
  }, [defaultGradePrice, sections.grades, setValue])

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
        if (onImageChange) {
          onImageChange(reader.result as string)
        }
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
      if (onImageChange) {
        onImageChange(null)
      }
    }
  }
  const handlePreviewClick = () => {
    if (imagePreview) setShowPreviewModal(true)
  }

  return (
    <div className="px-4 sm:px-6 py-6 bg-white rounded-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-xl text-gray-900">
            Product Details
          </span>
          {(getValidationError("name") || getValidationError("code") || getValidationError("subcategory_id")) && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
        <Switch
          checked={sections.productDetails}
          onCheckedChange={() => toggleSection("productDetails")}
          className="data-[state=checked]:bg-[#1162a8]"
        />
      </div>
      {sections.productDetails && (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl h-[140px] w-[140px] bg-gradient-to-br from-gray-50 to-gray-100 hover:border-gray-400 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer group"
              onClick={handleImageClick}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
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
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
            </div>
            <span className="text-xs text-gray-500 text-center max-w-[140px]">
              Click to upload product image
            </span>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handlePreviewClick}
                disabled={!imagePreview}
              >
                Preview Image
              </Button>
              {imagePreview && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setImagePreview(null)
                    if (onImageChange) {
                      onImageChange(null)
                    }
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              )}
            </div>
            <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
              <DialogContent
                className="flex flex-col items-center justify-center p-0"
                style={{
                  width: "100vw",
                  height: "100vh",
                  maxWidth: "100vw",
                  maxHeight: "100vh",
                  borderRadius: 0,
                  boxShadow: "none",
                  padding: 0,
                  background: "transparent",
                  overflow: "visible", // <-- allow overflow for button
                }}
              >
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <img
                    src={imagePreview || ""}
                    alt="Preview"
                    className="w-auto h-auto max-w-[90vw] max-h-[80vh] object-contain rounded-lg mb-8"
                    style={{ background: "transparent" }}
                  />
                  <div className="w-full flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowPreviewModal(false)}
                      className="mt-4 text-lg px-8 py-4 rounded-full font-bold bg-[#1162a8] text-white hover:bg-[#0d4d87] transition-colors"
                      style={{
                        fontSize: "1.5rem",
                        padding: "1rem 3rem",
                        minWidth: 180,
                        whiteSpace: "nowrap",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex-1 space-y-5">
            <Input
              placeholder="Product Name"
              className={`h-12 text-lg font-medium border-2 focus:ring-2 focus:ring-[#1162a8]/20 focus:border-[#1162a8] transition-all ${getValidationError("name") ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200"}`}
              {...register("name")}
              disabled={isCustomDisabled}
            />
            <Input
              placeholder="Product Code"
              className={`h-12 border-2 focus:ring-2 focus:ring-[#1162a8]/20 focus:border-[#1162a8] transition-all ${getValidationError("code") ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200"}`}
              {...register("code")}
              disabled={isCustomDisabled}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Controller
                name="subcategory_id"
                control={control}
                render={({ field }) => (
                  <select
                    className={`h-12 w-full px-3 border-2 rounded-md bg-white focus:ring-2 focus:ring-[#1162a8]/20 focus:border-[#1162a8] focus:outline-none transition-all ${getValidationError("subcategory_id") ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200"}`}
                    value={field.value ? field.value : ""}
                    onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Select Sub Category</option>
                    {currentParentDropdownCategories?.length > 0
                      ? currentParentDropdownCategories.map((subcat) => (
                          <option key={subcat.id} value={subcat.id}>
                            {subcat.name}
                          </option>
                        ))
                      : <option value="" disabled>No subcategories available</option>
                    }
                  </select>
                )}
              />
              <div className="relative">
                <Controller
                  name="base_price"
                  control={control}
                  render={({ field }) => (
                    <input
                      placeholder="Product Base Price"
                      className={`h-12 pl-8 pr-10 border-2 focus:ring-2 focus:ring-[#1162a8]/20 focus:border-[#1162a8] transition-all ${
                        sections.grades 
                          ? "border-gray-200 bg-gray-50" 
                          : "border-gray-200"
                      }`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={sections.grades ? defaultGradePrice : (field.value || "")}
                      onChange={e => field.onChange(e.target.value)}
                      readOnly={sections.grades}
                    />
                  )}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <Info className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" title={sections.grades ? "Base price is set by the default grade" : "Enter the base price for this product"} />
              </div>
            </div>
            {userRole !== "superadmin" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Controller
                name="min_days_to_process"
                control={control}
                render={({ field }) => (
                  <Input
                    placeholder="Min Days to Process"
                    className={`h-12 border-2 focus:ring-2 focus:ring-[#1162a8]/20 focus:border-[#1162a8] transition-all ${getValidationError("min_days_to_process") ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200"}`}
                    type="number"
                    min="1"
                    value={field.value !== null && field.value !== undefined ? field.value : ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                )}
              />
              <div className="relative">
                <Controller
                  name="max_days_to_process"
                  control={control}
                  render={({ field }) => (
                    <Input
                      placeholder="Max Days to Process"
                      className={`h-12 pr-10 border-2 focus:ring-2 focus:ring-[#1162a8]/20 focus:border-[#1162a8] transition-all ${getValidationError("max_days_to_process") ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200"}`}
                      type="number"
                      min="1"
                      value={field.value !== null && field.value !== undefined ? field.value : ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Maximum days required to process this product">
                  <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
      <ValidationError message={getValidationError("name") || getValidationError("code") || getValidationError("subcategory_id")} />
    </div>
  )
}
