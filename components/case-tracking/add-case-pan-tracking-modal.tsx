"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColorPicker } from "@/components/ui/color-picker"
import { useTranslation } from "react-i18next"
import { useCaseTracking } from "@/contexts/case-tracking-context"

interface AddCasePanModalProps {
  isOpen: boolean
  onClose: () => void
  editData?: any
  mode?: "add" | "edit"
}

const PRESET_COLORS = [
  "#cf0202", // Red
  "#1E88E5", // Blue
  "#11a85d", // Green
  "#f6be2c", // Yellow/Orange
  "#9e9e9e", // Gray
  "#f6692c", // Orange
  "#a81180", // Purple
  "#119ba8", // Teal
  "#b4d54c", // Lime
  "#f6442c", // Deep Orange
  "#9b27b0", // Purple
  "#2e8b8b", // Teal Green
]

export function AddCasePanTrackingModal({ isOpen, onClose, editData, mode = "add" }: AddCasePanModalProps) {
  const { t } = useTranslation()
  const { createCasePan, updateCasePan } = useCaseTracking()

  const [formData, setFormData] = useState({
    name: "",
    prefixLetter: "",
    quantity: "",
    codeFormat: "numeric",
    color: "#1E88E5",
    activeStatus: true,
    setAsRushGroup: false,
  })

  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (editData && mode === "edit") {
      setFormData({
        name: editData.name || "",
        prefixLetter: editData.code || "",
        quantity: editData.quantity?.toString() || "",
        codeFormat: editData.codeFormat || "numeric",
        color: editData.color_code || "#1E88E5",
        activeStatus: editData.status === "Active",
        setAsRushGroup: editData.isRushGroup || false,
      })
    } else {
      resetForm()
    }
  }, [editData, mode, isOpen])

  const resetForm = () => {
    setFormData({
      name: "",
      prefixLetter: "",
      quantity: "",
      codeFormat: "numeric",
      color: "#1E88E5",
      activeStatus: true,
      setAsRushGroup: false,
    })
    setHasChanges(false)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        name: formData.name,
        code: formData.prefixLetter,
        quantity: parseInt(formData.quantity),
        codeFormat: formData.codeFormat,
        color_code: formData.color,
        status: formData.activeStatus ? "Active" : "Inactive",
        isRushGroup: formData.setAsRushGroup,
      }

      if (mode === "edit" && editData?.id) {
        await updateCasePan(editData.id, payload)
      } else {
        await createCasePan(payload)
      }

      resetForm()
      onClose()
    } catch (error) {
      console.error("Error saving case pan:", error)
    }
  }

  const isFormValid = formData.name.trim() && formData.prefixLetter.trim() && formData.quantity.trim()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-medium flex items-center gap-2">
              <div className="bg-[#1162a8] text-white p-2 rounded">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 5V15M5 10H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              {mode === "edit" ? t("caseTracking.editCasePan", "Edit case pan") : t("caseTracking.addCasePan", "Add Case Pan")}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 mb-6">
            {t("caseTracking.addCasePanDescription", "Create a new case tracking group with prefix, capacity, and linked categories.")}
          </p>

          <div className="space-y-5">
            {/* Case Pan Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("caseTracking.casePanName", "Case Pan Name")}
              </label>
              <Input
                placeholder={t("caseTracking.casePanNamePlaceholder", "e.g., Rush case, Regular case, Full Dentures only")}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="h-11"
              />
            </div>

            {/* Prefix Letter and Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("caseTracking.prefixLetter", "Prefix Letter")}
                </label>
                <Input
                  placeholder="R"
                  value={formData.prefixLetter}
                  onChange={(e) => handleInputChange("prefixLetter", e.target.value.toUpperCase())}
                  maxLength={1}
                  className="h-11"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("caseTracking.quantity", "Quantity")}
                </label>
                <Input
                  type="number"
                  placeholder="200"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Code Format */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("caseTracking.codeFormat", "Code Format")}
              </label>
              <Select value={formData.codeFormat} onValueChange={(value) => handleInputChange("codeFormat", value)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">{t("caseTracking.numericOnly", "Numeric only (01 - 99)")}</SelectItem>
                  <SelectItem value="alphanumeric">{t("caseTracking.alphanumeric", "Alphanumeric (A01 - Z99)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("caseTracking.color", "Color")}
              </label>
              <div className="flex items-center gap-4">
                <ColorPicker
                  value={formData.color}
                  onChange={(color) => handleInputChange("color", color)}
                  predefinedColors={PRESET_COLORS}
                />
                <div className="flex items-center gap-2">
                  <div
                    className="w-12 h-12 rounded border-2 border-gray-300"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-sm font-mono">{formData.color}</span>
                </div>
              </div>

              {/* Preset Colors */}
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">{t("caseTracking.presetColors", "Preset Colors")}</p>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-10 h-10 rounded border-2 border-gray-300 hover:border-[#1162a8] transition-colors"
                      style={{ backgroundColor: color }}
                      onClick={() => handleInputChange("color", color)}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color */}
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">{t("caseTracking.customColor", "Custom Color")}</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-24 h-10 rounded border-2 border-gray-300"
                    style={{ backgroundColor: formData.color }}
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => handleInputChange("color", e.target.value)}
                    placeholder="#1E88E5"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Set as Rush Group */}
            <div className="flex items-center justify-between py-4 border-t border-b">
              <div>
                <p className="font-medium">{t("caseTracking.setAsRushGroup", "Set as Rush Group")}</p>
                <p className="text-sm text-gray-500">
                  {t("caseTracking.rushGroupDescription", "Automatically transfer rush cases to this group")}
                </p>
              </div>
              <Switch
                checked={formData.setAsRushGroup}
                onCheckedChange={(checked) => handleInputChange("setAsRushGroup", checked)}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <p className="font-medium">{t("caseTracking.activeStatus", "Active Status")}</p>
              <Switch
                checked={formData.activeStatus}
                onCheckedChange={(checked) => handleInputChange("activeStatus", checked)}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t("caseTracking.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="bg-[#1162a8] hover:bg-[#0f5490]"
          >
            {mode === "edit" ? t("caseTracking.save", "Save") : t("caseTracking.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
