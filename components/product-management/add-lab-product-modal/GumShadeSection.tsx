import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Info, Plus, AlertCircle, X, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"

type WatchedGumShade = {
  gum_shade_id: number
  sequence?: number
}

type GumShade = {
  id: number
  name: string
  brand_id: number
  sequence?: number
  status?: string
  color_code_top?: string
  color_code_middle?: string
  color_code_bottom?: string
}

type GumShadeBrand = {
  id: number
  name: string
  system_name?: string
  status?: string
  sequence?: number
  shades?: GumShade[]
}

type GumShadeSectionProps = {
  control: any
  watch: (field: string) => any
  setValue: (field: string, value: any, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void
  sections: any
  toggleSection: (section: string) => void
  getValidationError: (field: string) => string | undefined
  gumShadeBrands: GumShadeBrand[] | { data?: GumShadeBrand[] }
  sectionHasErrors: (fields: string[]) => boolean
  expandedSections: any
  toggleExpanded: (section: string) => void
  handleToggleSelection: (section: string, id: number, sequence?: number) => void
  customGumShadeNames?: Record<number, string>
  setCustomGumShadeNames?: React.Dispatch<React.SetStateAction<Record<number, string>>>
}

export function GumShadeSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  gumShadeBrands,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  customGumShadeNames = {},
  setCustomGumShadeNames,
}: GumShadeSectionProps) {
  const watchedGumShades = (watch("gum_shades") || []) as WatchedGumShade[]
  const [customGumShadeName, setCustomGumShadeName] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  // Defensive: handle both array and object with data property
  let brands: GumShadeBrand[] = []
  if (Array.isArray(gumShadeBrands)) {
    brands = gumShadeBrands
  } else if (gumShadeBrands && typeof gumShadeBrands === "object" && "data" in gumShadeBrands) {
    const data = (gumShadeBrands as { data?: GumShadeBrand[] | { data?: GumShadeBrand[] } }).data
    if (Array.isArray(data)) {
      brands = data
    } else if (data && typeof data === "object" && "data" in data) {
      brands = (data as { data?: GumShadeBrand[] }).data || []
    }
  }

  // State to track which brands are expanded
  const [expandedBrands, setExpandedBrands] = useState<Record<number, boolean>>({})

  // Toggle brand expansion
  const toggleBrandExpansion = (brandId: number) => {
    setExpandedBrands((prev) => ({
      ...prev,
      [brandId]: !prev[brandId],
    }))
  }

  // Generate a temporary ID for custom gum shade (using negative number to avoid conflicts)
  const generateCustomGumShadeId = (): number => {
    const existingIds = watchedGumShades.map((gs: WatchedGumShade) => 
      typeof gs.gum_shade_id === "number" ? gs.gum_shade_id : 0
    )
    const minId = Math.min(...existingIds, 0)
    return minId - 1
  }

  // Handle adding custom gum shade
  const handleAddCustomGumShade = () => {
    if (!customGumShadeName.trim()) {
      return // Don't add if name is empty
    }

    const customGumShadeId = generateCustomGumShadeId()
    
    // Store the custom gum shade name
    if (setCustomGumShadeNames) {
      setCustomGumShadeNames((prev) => ({
        ...prev,
        [customGumShadeId]: customGumShadeName.trim(),
      }))
    }

    // Add the custom gum shade to the form
    const currentList = watchedGumShades || []
    const newSequence = currentList.length === 0 
      ? 1 
      : Math.max(...currentList.map((gs: WatchedGumShade) => gs.sequence || 0)) + 1

    const newGumShade: WatchedGumShade = {
      gum_shade_id: customGumShadeId,
      sequence: newSequence,
    }

    setValue("gum_shades", [...currentList, newGumShade], { shouldDirty: true })

    // Reset form
    setCustomGumShadeName("")
    setShowCustomInput(false)
  }

  // Handle deleting custom gum shade
  const handleDeleteCustomGumShade = (id: number) => {
    // Remove from watched gum shades
    const updatedGumShades = watchedGumShades.filter(
      (gs: WatchedGumShade) => gs.gum_shade_id !== id
    )
    setValue("gum_shades", updatedGumShades, { shouldDirty: true })

    // Remove from custom gum shade names
    if (setCustomGumShadeNames) {
      setCustomGumShadeNames((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  // Get custom gum shades - show all custom shades that exist (either in watchedGumShades or in customGumShadeNames)
  const getCustomGumShades = (): Array<{ gum_shade_id: number; sequence?: number }> => {
    // Get all custom shade IDs from both watchedGumShades and customGumShadeNames
    const customIdsFromWatched = watchedGumShades
      .filter((gs: WatchedGumShade) => typeof gs.gum_shade_id === "number" && gs.gum_shade_id < 0)
      .map((gs: WatchedGumShade) => gs.gum_shade_id as number)
    
    const customIdsFromNames = Object.keys(customGumShadeNames).map(Number).filter(id => id < 0)
    
    // Combine and deduplicate
    const allCustomIds = [...new Set([...customIdsFromWatched, ...customIdsFromNames])]
    
    // Return array with gum_shade_id and sequence (get sequence from watchedGumShades if available)
    return allCustomIds.map((id) => {
      const watchedShade = watchedGumShades.find((gs: WatchedGumShade) => gs.gum_shade_id === id)
      return {
        gum_shade_id: id,
        sequence: watchedShade?.sequence ?? 1,
      }
    })
  }

  // Calculate selected count for each brand
  const getBrandSelectedCount = (brand: GumShadeBrand) => {
    if (!Array.isArray(brand.shades)) return 0
    return brand.shades.filter((shade: GumShade) =>
      watchedGumShades.some((gs: WatchedGumShade) => gs.gum_shade_id === shade.id)
    ).length
  }

  // Defensive: ensure brands is always an array
  if (!Array.isArray(brands)) {
    console.error("GumShadeSection: gumShadeBrands is not an array", gumShadeBrands)
    return (
      <div className="border-t px-6 py-4 text-red-500">
        Gum shade brands data is invalid or missing.
      </div>
    )
  }

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Gum Shade</span>
          {sectionHasErrors(["gum_shades"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedGumShades.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedGumShades.length} selected</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Switch
            checked={sections.gumShade}
            onCheckedChange={() => toggleSection("gumShade")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.gumShade ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("gumShade")}
          />
        </div>
      </div>
      {expandedSections.gumShade && sections.gumShade && (
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-700 mb-4">
            Choose the gum shade you accept for this product.
          </p>
          <div className="flex flex-col gap-4">
            {brands.length > 0 ? (
              brands.map((brand) => {
                const isExpanded = expandedBrands[brand.id] || false
                const selectedCount = getBrandSelectedCount(brand)
                const totalShades = Array.isArray(brand.shades) ? brand.shades.length : 0

                return (
                  <div key={brand.id} className="border rounded-lg">
                    {/* Brand Header - Clickable */}
                    <button
                      type="button"
                      onClick={() => toggleBrandExpansion(brand.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                        <span className="font-medium text-left">{brand.name}</span>
                        {selectedCount > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8]">
                            {selectedCount} selected
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {totalShades} {totalShades === 1 ? "shade" : "shades"}
                      </span>
                    </button>

                    {/* Brand Shades - Collapsible */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                          {Array.isArray(brand.shades) && brand.shades.length > 0 ? (
                            brand.shades.map((shade: GumShade, idx: number) => {
                              const checkboxId = `gum-shade-${shade.id}`
                              const isChecked = watchedGumShades.some((gs: WatchedGumShade) => gs.gum_shade_id === shade.id)
                              
                              const handleLabelClick = (e: React.MouseEvent) => {
                                e.preventDefault()
                                handleToggleSelection(
                                  "gum_shades",
                                  shade.id,
                                  shade.sequence ?? idx + 1
                                )
                              }
                              
                              return (
                                <div key={shade.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={checkboxId}
                                    className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                                    checked={isChecked}
                                    onCheckedChange={() =>
                                      handleToggleSelection(
                                        "gum_shades",
                                        shade.id,
                                        shade.sequence ?? idx + 1
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={checkboxId}
                                    className="cursor-pointer select-none"
                                    onClick={handleLabelClick}
                                  >
                                    {shade.name}
                                  </Label>
                                </div>
                              )
                            })
                          ) : (
                            <span className="col-span-2 text-gray-400 italic">No shades for this brand.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <span className="text-gray-400 italic">No gum shade brands available.</span>
            )}
            
            {/* Custom Gum Shades Section */}
            {getCustomGumShades().length > 0 && (
              <div className="border rounded-lg">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <span className="font-medium text-gray-700">Custom Gum Shades</span>
                </div>
                <div className="px-4 pb-4 pt-2">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    {getCustomGumShades().map((customShade: WatchedGumShade) => {
                      const customShadeId = customShade.gum_shade_id
                      const customShadeName = customGumShadeNames[customShadeId] || "Custom Gum Shade"
                      const checkboxId = `custom-gum-shade-${customShadeId}`
                      const isChecked = watchedGumShades.some(
                        (gs: WatchedGumShade) => gs.gum_shade_id === customShadeId
                      )
                      
                      const handleLabelClick = (e: React.MouseEvent) => {
                        e.preventDefault()
                        handleToggleSelection(
                          "gum_shades",
                          customShadeId,
                          customShade.sequence ?? 1
                        )
                      }
                      
                      return (
                        <div key={customShadeId} className="flex items-center gap-2">
                          <Checkbox
                            id={checkboxId}
                            className="border-[#1162a8] text-[#1162a8] data-[state=checked]:bg-[#1162a8] data-[state=checked]:text-white"
                            checked={isChecked}
                            onCheckedChange={() =>
                              handleToggleSelection(
                                "gum_shades",
                                customShadeId,
                                customShade.sequence ?? 1
                              )
                            }
                          />
                          <Label
                            htmlFor={checkboxId}
                            className="cursor-pointer select-none flex-1"
                            onClick={handleLabelClick}
                          >
                            {customShadeName}
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteCustomGumShade(customShadeId)
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
                  placeholder="Enter gum shade name"
                  value={customGumShadeName}
                  onChange={(e) => setCustomGumShadeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCustomGumShade()
                    } else if (e.key === "Escape") {
                      setShowCustomInput(false)
                      setCustomGumShadeName("")
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomGumShade}
                  disabled={!customGumShadeName.trim()}
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
                    setCustomGumShadeName("")
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
          <ValidationError message={getValidationError("gum_shades")} />
        </div>
      )}
    </div>
  )
}