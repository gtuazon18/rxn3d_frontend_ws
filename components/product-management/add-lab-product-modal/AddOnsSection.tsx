import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ChevronDown, Info, AlertCircle, Search, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ValidationError } from "@/components/ui/validation-error"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"

export function AddOnsSection({
  control,
  watch,
  setValue,
  sections,
  toggleSection,
  getValidationError,
  addOns,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  userRole = "", // <-- default to empty string if undefined
}) {
  const watchedAddons = watch("addons") || []

  // Add search state
  const [searchQuery, setSearchQuery] = useState("")

  // Helper to get selected add-on by id
  const getSelectedAddon = (id: number) => watchedAddons.find((a) => a.addon_id === id)

  // Remove add-on from selected list
  const handleRemoveAddon = (addon_id: number) => {
    setValue(
      "addons",
      watchedAddons.filter((a) => a.addon_id !== addon_id),
      { shouldDirty: true }
    )
  }

  // Update price for a selected add-on
  const handlePriceChange = (addon_id: number, value: string | number) => {
    // Only use the value, not the whole event object
    setValue(
      "addons",
      watchedAddons.map((a) =>
        a.addon_id === addon_id ? { ...a, price: value } : a
      ),
      { shouldDirty: true }
    )
  }

  // Add add-on to selected list
  const handleAddAddon = (addOn) => {
    setValue(
      "addons",
      [
        ...watchedAddons,
        {
          addon_id: addOn.id,
          price: addOn.lab_addon?.price ?? addOn.price ?? "",
          sequence: addOn.sequence ?? 1,
        },
      ],
      { shouldDirty: true }
    )
  }

  // Toggle checkbox selection
  const handleCheckboxChange = (addOn, checked) => {
    if (checked) {
      handleAddAddon(addOn)
    } else {
      handleRemoveAddon(addOn.id)
    }
  }

  // Filter addOns by search query
  const filteredAddOns = addOns.filter(addOn =>
    addOn.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="border-t">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Add-ons</span>
          {sectionHasErrors(["addons"]) ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Info className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${watchedAddons.length === 0 ? "opacity-80" : ""}`}
            style={{ marginRight: "1rem" }}
          >
            <strong>{watchedAddons.length} selected</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Switch
            checked={sections.addOns}
            onCheckedChange={() => toggleSection("addOns")}
            className="data-[state=checked]:bg-[#1162a8]"
          />
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.addOns ? "rotate-180" : ""}`}
            onClick={() => toggleExpanded("addOns")}
          />
        </div>
      </div>
      {expandedSections.addOns && sections.addOns && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-4 mb-4">
            <Label htmlFor="link-all-addons">Link all add-ons?</Label>
            {["Yes", "No"].map((archLabel) => (
              <div key={archLabel} className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 ${archLabel === watch("link_all_addons") ? "border-[#1162a8]" : "border-gray-300"
                    } flex items-center justify-center cursor-pointer`}
                  onClick={() => setValue("link_all_addons", archLabel)}
                >
                  {archLabel === watch("link_all_addons") && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1162a8]"></div>
                  )}
                </div>
                <span className="ml-2 text-sm">{archLabel}</span>
              </div>
            ))}
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search Add-ons to change price"
              className="pl-8"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="border rounded">
            <div
              className="grid grid-cols-[40px_1fr_1fr_1fr_32px] gap-2 font-medium text-sm border-b px-4 py-2"
              style={{ color: "rgb(17 98 168)" }}
            >
              <div></div>
              <div>Add-ons</div>
              <div>Category</div>
              {userRole !== "superadmin" && <div>Price</div>}
              <div></div>
            </div>
            {filteredAddOns.map((addOn) => {
              const selected = getSelectedAddon(addOn.id)
              return (
                <div
                  key={addOn.id}
                  className="grid grid-cols-[40px_1fr_1fr_1fr_32px] items-center gap-2 px-4 py-2 border-b last:border-b-0"
                  style={selected ? { backgroundColor: "rgba(17,98,168,0.07)" } : {}}
                >
                  <div>
                    <Checkbox
                      checked={!!selected}
                      onCheckedChange={checked => handleCheckboxChange(addOn, checked)}
                      className="data-[state=checked]:bg-[rgb(17,98,168)] border-[rgb(17,98,168)]"
                    />
                  </div>
                  <div className={selected ? "font-medium" : ""} style={selected ? { color: "rgb(17,98,168)" } : {}}>
                    {addOn.name}
                  </div>
                  <div>{addOn.subcategory?.name || "N/A"}</div>
                  {userRole !== "superadmin" && (
                    <div>
                      <Input
                        type="number"
                        min={0}
                        value={
                          selected
                            ? selected.price ?? addOn.lab_addon?.price ?? addOn.price ?? ""
                            : addOn.lab_addon?.price ?? addOn.price ?? ""
                        }
                        onChange={e => handlePriceChange(addOn.id, e.target.value)}
                        className="w-24"
                        disabled={!selected}
                        style={selected ? { borderColor: "rgb(17,98,168)" } : {}}
                      />
                    </div>
                  )}
                  <div>
                  </div>
                </div>
              )
            })}
          </div>
          <ValidationError message={getValidationError("addons")} />
        </div>
      )}
    </div>
  )
}
