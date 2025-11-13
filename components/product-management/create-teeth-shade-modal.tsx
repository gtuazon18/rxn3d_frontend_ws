"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ChevronDown, Plus, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  useTeethShades,
  type TeethShadeBrandPayload,
  type ShadePayload,
  type Shade,
} from "@/contexts/product-teeth-shade-context"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next";

interface CreateTeethShadeModalProps {
  isOpen: boolean
  onClose: () => void
  onHasChangesChange: (hasChanges: boolean) => void
  teethShadeBrand?: any // for edit mode
  isEditing?: boolean
  onSave?: (payload: any) => void
  isCopying?: boolean // Flag to indicate if we're copying a teeth shade
}

export function CreateTeethShadeModal({
  isOpen,
  onClose,
  onHasChangesChange,
  teethShadeBrand,
  isEditing,
  onSave,
  isCopying = false,
}: CreateTeethShadeModalProps) {
  const { createTeethShadeBrand, isLoading, fetchAvailableShades, createCustomShade, teethShadeBrands } =
    useTeethShades()
  const { toast } = useToast()
  const { t } = useTranslation();
  const defaultFormData = {
    name: "",
    system_name: "",
    sequence: "",
    status: "Active",
    shades: [],
  }

  const [formData, setFormData] = useState<
    TeethShadeBrandPayload & { sequence: string; shades: (ShadePayload & { enabled: boolean })[] }
  >(defaultFormData)
  const [initialFormData, setInitialFormData] = useState(defaultFormData)

  const [teethShadeDetailsEnabled, setTeethShadeDetailsEnabled] = useState(true)
  const [listOfShadesOpen, setListOfShadesOpen] = useState(true)
  const [linkToProductsOpen, setLinkToProductsOpen] = useState(false)
  const [linkToExistingGroupOpen, setLinkToExistingGroupOpen] = useState(false)
  const [visibilityManagementOpen, setVisibilityManagementOpen] = useState(false)
  const [newShadeName, setNewShadeName] = useState("")
  const [selectedBrandForCustomShade, setSelectedBrandForCustomShade] = useState<string>("")

  const [availableShades, setAvailableShades] = useState<Shade[]>([])
  const [loadingShades, setLoadingShades] = useState(false)
  const [addingCustomShade, setAddingCustomShade] = useState(false)

  // Filter available shades by system_name (case-insensitive)
  const filteredAvailableShades = formData.system_name
    ? availableShades.filter((shade) => {
        // Find the brand that this shade belongs to
        const brand = teethShadeBrands.find((b) => b.id === shade.brand_id)
        // Only show shades from brands with matching system_name (case-insensitive)
        return brand?.system_name?.toUpperCase() === formData.system_name.toUpperCase()
      })
    : availableShades

  // Discard dialog states
  const [hasChanges, setHasChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // Reset form and initial state when modal opens or editing
  useEffect(() => {
    if (isOpen) {
      if (isCopying && teethShadeBrand) {
        // Copying: use the provided teethShadeBrand data directly (no API call needed)
        setFormData({
          name: teethShadeBrand.name || "",
          system_name: teethShadeBrand.system_name || "",
          sequence: teethShadeBrand.sequence?.toString() || "",
          status: teethShadeBrand.status || "Active",
          shades: (teethShadeBrand.shades || []).map((shade: any) => ({
            name: shade.name,
            sequence: shade.sequence,
            status: shade.status,
            enabled: shade.status === "Active",
          })),
        })
        setInitialFormData({
          name: teethShadeBrand.name || "",
          system_name: teethShadeBrand.system_name || "",
          sequence: teethShadeBrand.sequence?.toString() || "",
          status: teethShadeBrand.status || "Active",
          shades: (teethShadeBrand.shades || []).map((shade: any) => ({
            name: shade.name,
            sequence: shade.sequence,
            status: shade.status,
            enabled: shade.status === "Active",
          })),
        })
      } else if (isEditing && teethShadeBrand && !isCopying) {
        // Editing: populate form for editing
        setFormData({
          name: teethShadeBrand.name || "",
          system_name: teethShadeBrand.system_name || "",
          sequence: teethShadeBrand.sequence?.toString() || "",
          status: teethShadeBrand.status || "Active",
          shades: (teethShadeBrand.shades || []).map((shade: any) => ({
            name: shade.name,
            sequence: shade.sequence,
            status: shade.status,
            enabled: shade.status === "Active",
          })),
        })
        setInitialFormData({
          name: teethShadeBrand.name || "",
          system_name: teethShadeBrand.system_name || "",
          sequence: teethShadeBrand.sequence?.toString() || "",
          status: teethShadeBrand.status || "Active",
          shades: (teethShadeBrand.shades || []).map((shade: any) => ({
            name: shade.name,
            sequence: shade.sequence,
            status: shade.status,
            enabled: shade.status === "Active",
          })),
        })
      } else {
        // New teeth shade: reset form
        setFormData(defaultFormData)
        setInitialFormData(defaultFormData)
      }
      setHasChanges(false)
      if (onHasChangesChange) onHasChangesChange(false)
      setTeethShadeDetailsEnabled(true)
      setListOfShadesOpen(true)
      setLinkToProductsOpen(false)
      setLinkToExistingGroupOpen(false)
      setVisibilityManagementOpen(false)
      setNewShadeName("")
      setSelectedBrandForCustomShade("")
    }
  }, [isOpen, isEditing, teethShadeBrand, isCopying, onHasChangesChange])

  // Fetch available shades when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadAvailableShades = async () => {
        setLoadingShades(true)
        try {
          const shades = await fetchAvailableShades()
          setAvailableShades(shades)
        } catch (error) {
          console.error("Error loading available shades:", error)
        } finally {
          setLoadingShades(false)
        }
      }

      loadAvailableShades()
    }
  }, [isOpen, fetchAvailableShades])

  // Track changes for discard dialog
  useEffect(() => {
    const currentShadesForComparison = formData.shades.map(({ enabled, ...rest }) => ({
      ...rest,
      status: enabled ? "Active" : "Inactive",
    }))
    const initialShadesForComparison = initialFormData.shades.map(({ enabled, ...rest }) => ({
      ...rest,
      status: enabled ? "Active" : "Inactive",
    }))

    const changed =
      formData.name !== initialFormData.name ||
      formData.system_name !== initialFormData.system_name ||
      formData.sequence !== initialFormData.sequence ||
      formData.status !== initialFormData.status ||
      JSON.stringify(currentShadesForComparison) !== JSON.stringify(initialShadesForComparison)

    setHasChanges(changed)
    if (onHasChangesChange) {
      onHasChangesChange(changed)
    }
  }, [formData, initialFormData, onHasChangesChange])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNumberInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addCustomShadeToAPI = async () => {
    if (newShadeName.trim() === "" || !selectedBrandForCustomShade) {
      toast({
        title: "Validation Error",
        description: "Please enter a shade name and select a brand.",
        variant: "destructive",
      })
      return
    }

    const brandId = Number.parseInt(selectedBrandForCustomShade)
    const selectedBrand = teethShadeBrands.find((brand) => brand.id === brandId)

    if (!selectedBrand) {
      toast({
        title: "Error",
        description: "Selected brand not found.",
        variant: "destructive",
      })
      return
    }

    // Calculate next sequence number for this brand
    const maxSequence = Math.max(...selectedBrand.shades.map((shade) => shade.sequence), 0)
    const nextSequence = maxSequence + 1

    setAddingCustomShade(true)

    try {
      const success = await createCustomShade({
        brand_id: brandId,
        name: newShadeName.trim(),
        sequence: nextSequence,
        status: "Active",
      })

      if (success) {
        // Refresh available shades to include the new custom shade
        const updatedShades = await fetchAvailableShades()
        setAvailableShades(updatedShades)

        // Also add the new shade to the current form data and automatically include it
        const newShade = {
          name: newShadeName.trim(),
          sequence: nextSequence,
          status: "Active",
          enabled: true,
        }

        setFormData((prev) => ({
          ...prev,
          shades: [...prev.shades, newShade],
        }))

        // Clear the input
        setNewShadeName("")
        setSelectedBrandForCustomShade("")

        toast({
          title: "Success",
          description: `Custom shade "${newShadeName.trim()}" added successfully!`,
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error adding custom shade:", error)
    } finally {
      setAddingCustomShade(false)
    }
  }

  const addNewShade = () => {
    if (newShadeName.trim() === "") return

    // Create the new shade object
    const newShade = {
      name: newShadeName.trim(),
      sequence: formData.shades.length + 1,
      status: "Active",
      enabled: true,
    }

    // Add to form data
    setFormData((prev) => ({
      ...prev,
      shades: [...prev.shades, newShade],
    }))

    // Also add to available shades if it doesn't exist there yet
    if (!availableShades.some((shade) => shade.name === newShadeName.trim())) {
      setAvailableShades((prev) => [
        ...prev,
        {
          id: Math.random(), // Temporary ID for UI purposes
          name: newShadeName.trim(),
          sequence: formData.shades.length + 1,
          status: "Active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
    }

    setNewShadeName("")
  }

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
    const payload: TeethShadeBrandPayload = {
      name: formData.name,
      system_name: formData.system_name,
      sequence: Number.parseInt(formData.sequence),
      status: formData.status,
      shades: formData.shades.map((shade) => ({
        name: shade.name,
        sequence: shade.sequence,
        status: shade.enabled ? "Active" : "Inactive",
      })),
    }

    try {
      // If copying, always create a new teeth shade (not update)
      if (isEditing && onSave && !isCopying) {
        await onSave(payload)
      } else {
        // Create new teeth shade (either new or copy)
        const success = await createTeethShadeBrand(payload)
        if (success) {
          setHasChanges(false)
          if (onHasChangesChange) onHasChangesChange(false)
          onClose()
        }
      }
    } catch (error) {
      console.error("Error saving teeth shade brand:", error)
    }
  }

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.sequence.trim() !== "" &&
    !isNaN(Number.parseInt(formData.sequence)) &&
    formData.status.trim() !== "" &&
    formData.shades.length > 0 &&
    formData.shades.every((shade) => shade.name.trim() !== "")

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <DialogContent className="p-0 gap-0 sm:max-w-[600px] overflow-hidden bg-white rounded-md">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {isCopying ? "Copy Teeth Shade System" : isEditing ? "Edit Teeth Shade System" : "Create Teeth Shade System"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleAttemptClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(80vh-130px)] p-6 space-y-6">
            {/* Teeth Shade Details Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Teeth Shade Details</span>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
              <Switch
                checked={teethShadeDetailsEnabled}
                onCheckedChange={setTeethShadeDetailsEnabled}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {teethShadeDetailsEnabled && (
              <div className="space-y-4">
                <Input
                  placeholder="Teeth Shade Brand Name *"
                  className="h-12"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  validationState={formData.name.trim() ? "valid" : "default"}
                  required
                />
                <Input
                  placeholder="Teeth Shade System Name"
                  className="h-12"
                  value={formData.system_name}
                  onChange={(e) => handleInputChange("system_name", e.target.value)}
                  validationState={formData.system_name.trim() ? "valid" : "default"}
                />
                <Input
                  placeholder="Sequence *"
                  type="number"
                  className="h-12"
                  value={formData.sequence}
                  onChange={(e) => handleNumberInputChange("sequence", e.target.value)}
                  validationState={formData.sequence ? "valid" : "default"}
                  required
                />
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Status *" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* List of Shades Section */}
            <Collapsible open={listOfShadesOpen} onOpenChange={setListOfShadesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full border-t border-b py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">List of Shades</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${listOfShadesOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {loadingShades ? (
                  <div className="text-center py-4">Loading available shades...</div>
                ) : (
                  <>
                    <div className="border rounded-md overflow-hidden mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-center">Available Shades</TableHead>
                            <TableHead className="text-center">Include</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAvailableShades.length > 0 ? (
                            filteredAvailableShades.map((shade) => {
                              const isIncluded = formData.shades.some((s) => s.name === shade.name)
                              const includedShade = formData.shades.find((s) => s.name === shade.name)

                              return (
                                <TableRow key={shade.id || shade.name}>
                                  <TableCell className="text-center">{shade.name}</TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={isIncluded}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setFormData((prev) => ({
                                            ...prev,
                                            shades: [
                                              ...prev.shades,
                                              {
                                                name: shade.name,
                                                sequence: shade.sequence,
                                                status: "Active",
                                                enabled: true,
                                              },
                                            ],
                                          }))
                                        } else {
                                          setFormData((prev) => ({
                                            ...prev,
                                            shades: prev.shades.filter((s) => s.name !== shade.name),
                                          }))
                                        }
                                      }}
                                      className="data-[state=checked]:bg-[#1162a8]"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {isIncluded && (
                                      <Switch
                                        checked={includedShade?.enabled ?? true}
                                        onCheckedChange={(enabled) => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            shades: prev.shades.map((s) =>
                                              s.name === shade.name ? { ...s, enabled } : s,
                                            ),
                                          }))
                                        }}
                                        className="data-[state=checked]:bg-[#1162a8]"
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                                No shades available.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Add to Current Form Section */}
                    <div className="flex gap-2 mb-4">
                      <Input
                        placeholder="Add shade to current form"
                        validationState={newShadeName.trim() ? "valid" : "default"}
                        value={newShadeName}
                        onChange={(e) => setNewShadeName(e.target.value)}
                        className="h-10"
                      />
                      <Button
                        onClick={addNewShade}
                        disabled={!newShadeName.trim()}
                        className="bg-[#1162a8] hover:bg-[#0d4d87]"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Custom
                      </Button>
                    </div>
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

         
          </div>

          {/* Footer with action buttons */}
          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button variant="destructive" onClick={handleAttemptClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid || isLoading}
              className="bg-[#1162a8] hover:bg-[#0d4d87] disabled:opacity-50"
            >
              {isLoading ? (isCopying ? "Copying..." : isEditing ? "Saving..." : "Saving...") : (isCopying ? "Copy Teeth Shade" : isEditing ? "Save Changes" : "Save Teeth Shade")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showDiscardDialog && (
        <DiscardChangesDialog
          isOpen={showDiscardDialog}
          type="teeth-shade"
          onDiscard={handleActualDiscard}
          onKeepEditing={handleKeepEditing}
        />
      )}
    </>
  )
}
