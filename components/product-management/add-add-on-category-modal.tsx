"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronDown, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAddOns, type AddOn } from "@/contexts/product-add-on-category-context"
import { DiscardChangesDialog } from "./discard-changes-dialog"

interface AddAddOnModalProps {
  isOpen: boolean
  onClose: () => void
  onHasChangesChange: (hasChanges: boolean) => void
  addOn?: AddOn | null
  isEditing?: boolean
}

export function AddAddOnCategoryModal({ isOpen, onClose, onHasChangesChange, addOn, isEditing = false }: AddAddOnModalProps) {
  const {
    addOnCategoriesForSelect,
    fetchAddOnCategoriesForSelect,
    isLoadingCategoriesForSelect,
    createAddOn,
    updateAddOn,
    createAddOnSubCategory,
    showAnimation,
    triggerAnimation,
  } = useAddOns()

  const defaultFormData = {
    name: "",
    code: "",
    price: "",
    type: "Both",
    status: "Active",
    sequence: "",
    subcategory_id: "",
    createNewSubCategory: false,
    parentCategoryId: "",
  }

  const [formData, setFormData] = useState(defaultFormData)
  const [initialFormData, setInitialFormData] = useState(defaultFormData)

  const [addOnDetailsEnabled, setAddOnDetailsEnabled] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToExistingGroupOpen, setLinkToExistingGroupOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)

  // Discard dialog states
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (addOn && isEditing) {
        const editData = {
          name: addOn.name,
          code: addOn.code || "",
          price: addOn.price?.toString() || "",
          type: addOn.type || "Both",
          status: addOn.status,
          sequence: addOn.sequence?.toString() || "",
          subcategory_id: addOn.subcategory_id?.toString() || "",
          createNewSubCategory: false,
          parentCategoryId: "",
        }
        setFormData(editData)
        setInitialFormData(editData)
      } else {
        setFormData(defaultFormData)
        setInitialFormData(defaultFormData)
      }
      setHasChanges(false)
      if (onHasChangesChange) onHasChangesChange(false)
      setAddOnDetailsEnabled(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupOpen(false)
      setVisibilityManagementOpen(false)
    }
  }, [isOpen, addOn, isEditing, onHasChangesChange])

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen && !addOnCategoriesForSelect.length) {
      fetchAddOnCategoriesForSelect()
    }
  }, [isOpen, addOnCategoriesForSelect, fetchAddOnCategoriesForSelect])

  // Track changes for discard dialog
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialFormData)
    setHasChanges(changed)
    if (onHasChangesChange) {
      onHasChangesChange(changed)
    }
  }, [formData, initialFormData, onHasChangesChange])

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Get all subcategories for direct selection
  const allSubcategories = addOnCategoriesForSelect.flatMap(
    (cat) =>
      cat.subcategories?.map((sub) => ({
        id: sub.id,
        name: sub.name,
        categoryName: cat.name,
        categoryId: cat.id,
      })) || [],
  )

  const handleAttemptClose = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }, [hasChanges, onClose])

  const handleActualDiscard = () => {
    setShowDiscardDialog(false)
    setHasChanges(false)
    if (onHasChangesChange) onHasChangesChange(false)
    onClose()
  }

  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }


  const handleSave = async () => {
    let finalSubcategoryId: number | null = null

    if (formData.createNewSubCategory) {
      // Create new subcategory first
      if (!formData.name.trim() || !formData.parentCategoryId) {
        triggerAnimation("error", "Sub-category name and parent category are required.")
        return
      }

      const newSubCategory = await createAddOnSubCategory({
        name: formData.name,
        code: formData.code,
        category_id: Number(formData.parentCategoryId),
        type: formData.type as "Upper" | "Lower" | "Both",
        sequence: Number(formData.sequence) || 0,
        status: formData.status as "Active" | "Inactive",
      })

      if (!newSubCategory) {
        return // Error handled by context
      }

      finalSubcategoryId = newSubCategory.id
    } else {
      finalSubcategoryId = Number(formData.subcategory_id)
    }

    // Create or update the add-on
    const payload = {
      name: formData.createNewSubCategory ? `${formData.name} Add-on` : formData.name,
      code: formData.code,
      price: formData.price !== "" ? Number.parseFloat(formData.price) : null,
      type: formData.type as "Upper" | "Lower" | "Both",
      status: formData.status as "Active" | "Inactive",
      sequence: formData.sequence !== "" ? Number.parseInt(formData.sequence) : 0,
      subcategory_id: finalSubcategoryId,
    }

    try {
      let success = false
      if (isEditing && addOn) {
        success = !!(await updateAddOn(addOn.id, payload))
      } else {
        success = !!(await createAddOn(payload))
      }

      if (success) {
        setHasChanges(false)
        if (onHasChangesChange) onHasChangesChange(false)
        onClose()
      }
    } catch (error) {
      console.error("Error saving add-on:", error)
    }
  }

  const isFormValid =
  formData.name.trim() !== "" &&
  formData.status.trim() !== "" && formData.createNewSubCategory ? formData.parentCategoryId.trim() !== "" : true
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DialogContent className="p-0 gap-0 sm:max-w-[600px] overflow-hidden bg-white rounded-md">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">{isEditing ? "Edit Add-on Category" : "Create Add-on Category"}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(80vh-130px)] p-6 space-y-6">
            {/* Add-on Details Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Add-on Category Details</span>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
              <Switch
                checked={addOnDetailsEnabled}
                onCheckedChange={setAddOnDetailsEnabled}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {addOnDetailsEnabled && (
              <div className="space-y-4">
                <Input
                  placeholder={formData.createNewSubCategory ? "Sub-Category Name *" : "Add-on Name *"}
                  className="h-12"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
                <Input
                  placeholder={formData.createNewSubCategory ? "Sub-Category Code" : "Add-on Code"}
                  className="h-12"
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                />
              

                <Input
                  placeholder={formData.createNewSubCategory ? "Sub-Category Sequence" : "Sequence"}
                  type="number"
                  className="h-12"
                  value={formData.sequence}
                  onChange={(e) => handleInputChange("sequence", e.target.value)}
                />
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue
                      placeholder={formData.createNewSubCategory ? "Sub-Category Status *" : "Select Status *"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Link to Products Section */}
            <Collapsible open={linkToProductsOpen} onOpenChange={setLinkToProductsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Link to Products</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${linkToProductsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-gray-600 mb-4">Select products to link this add-on to.</p>
              </CollapsibleContent>
            </Collapsible>

            {/* Link to Existing Group Section */}
            <Collapsible open={linkToExistingGroupOpen} onOpenChange={setLinkToExistingGroupOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Link to Existing Group</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${linkToExistingGroupOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-gray-600 mb-4">Select groups to link this add-on to.</p>
              </CollapsibleContent>
            </Collapsible>

            {/* Visibility Management Section */}
            <Collapsible open={visibilityManagementOpen} onOpenChange={setVisibilityManagementOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Visibility Management</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${visibilityManagementOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-gray-600 mb-4">Manage which labs can see this add-on.</p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Footer with action buttons */}
          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button variant="destructive" onClick={handleAttemptClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={!isFormValid || showAnimation}
            >
              {showAnimation
                ? "Saving..."
                : isEditing
                  ? "Update Add-on"
                  : formData.createNewSubCategory
                    ? "Create Sub-Category & Add-on"
                    : "Save Add-on Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showDiscardDialog && (
        <DiscardChangesDialog
          isOpen={showDiscardDialog}
          type="add-on"
          onDiscard={handleActualDiscard}
          onKeepEditing={handleKeepEditing}
        />
      )}
    </>
  )
}
