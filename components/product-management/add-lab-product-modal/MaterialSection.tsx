import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Info, Plus, AlertCircle, X, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"

type WatchedMaterial = {
  material_id: number
  sequence?: number
}

type Material = {
  id: number
  name: string
  sequence?: number
}

type MaterialSectionProps = {
  control: any
  watch: (field: string) => any
  setValue: (field: string, value: any, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void
  sections: any
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  materials: Material[]
  sectionHasErrors: (fields: string[]) => boolean
  expandedSections: any
  toggleExpanded: (section: string) => void
  handleToggleSelection: (section: string, id: number, sequence?: number) => void
  customMaterialNames?: Record<number, string>
  setCustomMaterialNames?: React.Dispatch<React.SetStateAction<Record<number, string>>>
}

export function MaterialSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  materials,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  customMaterialNames = {},
  setCustomMaterialNames,
}: MaterialSectionProps) {
  const watchedMaterials = (watch("materials") || []) as WatchedMaterial[]
  const [customMaterialName, setCustomMaterialName] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  
  // Generate a temporary ID for custom material (using negative number to avoid conflicts)
  const generateCustomMaterialId = (): number => {
    const existingIds = watchedMaterials.map((m: WatchedMaterial) => 
      typeof m.material_id === "number" ? m.material_id : 0
    )
    const minId = Math.min(...existingIds, 0)
    return minId - 1
  }

  // Handle adding custom material
  const handleAddCustomMaterial = () => {
    if (!customMaterialName.trim()) {
      return // Don't add if name is empty
    }

    const customMaterialId = generateCustomMaterialId()
    
    // Store the custom material name
    if (setCustomMaterialNames) {
      setCustomMaterialNames((prev) => ({
        ...prev,
        [customMaterialId]: customMaterialName.trim(),
      }))
    }

    // Add the custom material to the form
    const currentList = watchedMaterials || []
    const newSequence = currentList.length === 0 
      ? 1 
      : Math.max(...currentList.map((m: WatchedMaterial) => m.sequence || 0)) + 1

    const newMaterial: WatchedMaterial = {
      material_id: customMaterialId,
      sequence: newSequence,
    }

    setValue("materials", [...currentList, newMaterial], { shouldDirty: true })

    // Reset form
    setCustomMaterialName("")
    setShowCustomInput(false)
  }

  // Handle deleting custom material
  const handleDeleteCustomMaterial = (id: number) => {
    // Remove from watched materials
    const updatedMaterials = watchedMaterials.filter(
      (m: WatchedMaterial) => m.material_id !== id
    )
    setValue("materials", updatedMaterials, { shouldDirty: true })

    // Remove from custom material names
    if (setCustomMaterialNames) {
      setCustomMaterialNames((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  // Get custom materials - show all custom materials that exist (either in watchedMaterials or in customMaterialNames)
  const getCustomMaterials = (): Array<{ material_id: number; sequence?: number }> => {
    // Get all custom material IDs from both watchedMaterials and customMaterialNames
    const customIdsFromWatched = watchedMaterials
      .filter((m: WatchedMaterial) => typeof m.material_id === "number" && m.material_id < 0)
      .map((m: WatchedMaterial) => m.material_id as number)
    
    const customIdsFromNames = Object.keys(customMaterialNames).map(Number).filter(id => id < 0)
    
    // Combine and deduplicate
    const allCustomIds = [...new Set([...customIdsFromWatched, ...customIdsFromNames])]
    
    // Return array with material_id and sequence (get sequence from watchedMaterials if available)
    return allCustomIds.map((id) => {
      const watchedMaterial = watchedMaterials.find((m: WatchedMaterial) => m.material_id === id)
      return {
        material_id: id,
        sequence: watchedMaterial?.sequence ?? 1,
      }
    })
  }
  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Material</span>
          {sectionHasErrors(["materials"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedMaterials.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedMaterials.length} selected</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Switch
            checked={sections.material}
            onCheckedChange={() => toggleSection("material")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.material ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("material")}
          />
        </div>
      </div>
      {expandedSections.material && sections.material && (
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-700 mb-4">
            Choose your preferred materials for this product.
          </p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {materials.map((material) => {
                const checkboxId = `material-${material.id}`
                const isChecked = watchedMaterials.some((m: WatchedMaterial) => m.material_id === material.id)
                
                const handleLabelClick = (e: React.MouseEvent) => {
                  e.preventDefault()
                  handleToggleSelection("materials", material.id, material.sequence)
                }
                
                return (
                  <div key={material.id} className="flex items-center gap-2">
                    <Checkbox
                      id={checkboxId}
                      className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                      checked={isChecked}
                      onCheckedChange={() =>
                        handleToggleSelection("materials", material.id, material.sequence)
                      }
                    />
                    <Label
                      htmlFor={checkboxId}
                      className="cursor-pointer select-none"
                      onClick={handleLabelClick}
                    >
                      {material.name}
                    </Label>
                  </div>
                )
              })}
            </div>
            
            {/* Custom Materials Section */}
            {getCustomMaterials().length > 0 && (
              <div className="border rounded-lg">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <span className="font-medium text-gray-700">Custom Materials</span>
                </div>
                <div className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    {getCustomMaterials().map((customMaterial) => {
                      const customMaterialId = customMaterial.material_id
                      const customMaterialNameValue = customMaterialNames[customMaterialId] || "Custom Material"
                      const checkboxId = `custom-material-${customMaterialId}`
                      const isChecked = watchedMaterials.some(
                        (m: WatchedMaterial) => m.material_id === customMaterialId
                      )
                      
                      const handleLabelClick = (e: React.MouseEvent) => {
                        e.preventDefault()
                        handleToggleSelection(
                          "materials",
                          customMaterialId,
                          customMaterial.sequence ?? 1
                        )
                      }
                      
                      return (
                        <div key={customMaterialId} className="flex items-center gap-2">
                          <Checkbox
                            id={checkboxId}
                            className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                            checked={isChecked}
                            onCheckedChange={() =>
                              handleToggleSelection(
                                "materials",
                                customMaterialId,
                                customMaterial.sequence ?? 1
                              )
                            }
                          />
                          <Label
                            htmlFor={checkboxId}
                            className="cursor-pointer select-none flex-1"
                            onClick={handleLabelClick}
                          >
                            {customMaterialNameValue}
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteCustomMaterial(customMaterialId)
                            }}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Add Custom Input or Button */}
            {showCustomInput ? (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="text"
                  placeholder="Enter material name"
                  value={customMaterialName}
                  onChange={(e) => setCustomMaterialName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCustomMaterial()
                    } else if (e.key === "Escape") {
                      setShowCustomInput(false)
                      setCustomMaterialName("")
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomMaterial}
                  disabled={!customMaterialName.trim()}
                  className="bg-[#1162a8] hover:bg-[#1162a8]/90"
                >
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomMaterialName("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[#1162a8] pl-0 flex items-center gap-1 mt-2"
                onClick={() => setShowCustomInput(true)}
              >
                <Plus className="h-4 w-4" /> Add Custom
              </Button>
            )}
          </div>
          <ValidationError message={getValidationError("materials")} />
        </div>
      )}
    </div>
  )
}
