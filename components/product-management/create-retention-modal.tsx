"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ChevronDown, ChevronRight, Info, X } from "lucide-react"
import { DiscardChangesDialog } from "./discard-changes-dialog"
import { useRetention } from "@/contexts/product-retention-context"
import { useAuth } from "@/contexts/auth-context"

interface CreateRetentionModalProps {
  isOpen: boolean
  onClose: () => void
  retention?: any | null
}

export function CreateRetentionModal({ isOpen, onClose, retention }: CreateRetentionModalProps) {
  const { createRetention, updateRetention, getRetentionDetail } = useRetention()
  const { user } = useAuth()
  const [retentionName, setRetentionName] = useState("")
  const [retentionCode, setRetentionCode] = useState("")
  const [price, setPrice] = useState("")
  const [additionalPrice, setAdditionalPrice] = useState("")
  const [priceOption, setPriceOption] = useState("no-price")
  const [detailsEnabled, setDetailsEnabled] = useState(true)
  const [linkToProductsExpanded, setLinkToProductsExpanded] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Helper to check lab admin role (matches context logic)
  const isLabAdmin = (() => {
    if (!user) return false
    if (user.roles && user.roles.length > 0) {
      return user.roles[0] === "lab_admin"
    }
    return user.role === "lab_admin"
  })()

  // Get customer ID for lab admin
  const customerId = isLabAdmin ? user?.customers?.find((customer) => customer.id)?.id : undefined

  // Track changes
  useEffect(() => {
    const hasAnyChanges =
      retentionName.trim() !== "" ||
      retentionCode.trim() !== "" ||
      (isLabAdmin && price.trim() !== "") ||
      additionalPrice.trim() !== "" ||
      priceOption !== "no-price"
    setHasChanges(hasAnyChanges)
  }, [retentionName, retentionCode, price, additionalPrice, priceOption, isLabAdmin])

  // Clear errors when user starts typing
  useEffect(() => {
    if (retentionName.trim() !== "" && errors.retentionName) {
      setErrors((prev) => ({ ...prev, retentionName: "" }))
    }
  }, [retentionName, errors.retentionName])

  useEffect(() => {
    if (retentionCode.trim() !== "" && errors.retentionCode) {
      setErrors((prev) => ({ ...prev, retentionCode: "" }))
    }
  }, [retentionCode, errors.retentionCode])

  useEffect(() => {
    if (price.trim() !== "" && errors.price) {
      setErrors((prev) => ({ ...prev, price: "" }))
    }
  }, [price, errors.price])

  useEffect(() => {
    let ignore = false

    async function fetchAndSetDetail() {
      if (retention && retention.id) {
        const detail = await getRetentionDetail(retention.id)
        if (!ignore && detail) {
          setRetentionName(detail.name || "")
          setRetentionCode(detail.code || "")
          setPrice(detail.price ? detail.price.toString() : "")
          setPriceOption(detail.price ? "with-price" : "no-price")
        }
      } else {
        setRetentionName("")
        setRetentionCode("")
        setPrice("")
        setPriceOption("no-price")
      }
      setErrors({})
      setHasChanges(false)
    }

    fetchAndSetDetail()
    return () => { ignore = true }
  }, [retention, isOpen, getRetentionDetail])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!retentionName.trim()) {
      newErrors.retentionName = "Retention name is required"
    }

    if (!retentionCode.trim()) {
      newErrors.retentionCode = "Retention code is required"
    }

    if (isLabAdmin) {
      if (!price.trim()) {
        newErrors.price = "Price is required"
      } else if (isNaN(Number(price))) {
        newErrors.price = "Price must be a valid number"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }

  const handleDiscard = () => {
    setRetentionName("")
    setRetentionCode("")
    setPrice("")
    setAdditionalPrice("")
    setPriceOption("no-price")
    setDetailsEnabled(true)
    setLinkToProductsExpanded(false)
    setShowDiscardDialog(false)
    setHasChanges(false)
    setErrors({})
    onClose()
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      let priceValue = 0
      if (isLabAdmin) {
        priceValue = price.trim() !== "" && !isNaN(Number(price)) ? parseFloat(price) : 0
      }

      const payload: any = {
        name: retentionName.trim(),
        code: retentionCode.trim(),
        sequence: 1,
        status: "Active",
        price: priceValue,
        ...(isLabAdmin && customerId ? { customer_id: customerId } : {})
      }

      let success = false
      if (retention && retention.id) {
        success = await updateRetention(retention.id, payload)
      } else {
        success = await createRetention(payload)
      }

      if (success) {
        setRetentionName("")
        setRetentionCode("")
        setPrice("")
        setAdditionalPrice("")
        setPriceOption("no-price")
        setDetailsEnabled(true)
        setLinkToProductsExpanded(false)
        setHasChanges(false)
        setErrors({})
        onClose()
      }
    } catch (error) {
      console.error("Error creating/updating retention:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSaveDisabled = !retentionName.trim() || !retentionCode.trim() || (isLabAdmin && !price.trim()) || isSubmitting

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-white rounded-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DialogTitle className="text-xl font-bold">
              {retention && retention.id ? "Edit Retention Mechanism" : "Create New Retention Mechanism"}
            </DialogTitle>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Retention Mechanism Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Retention Mechanism Details</Label>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <Switch
                  className="data-[state=checked]:bg-[#1162a8]"
                  checked={detailsEnabled}
                  onCheckedChange={setDetailsEnabled}
                />
              </div>

              {detailsEnabled && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="retentionName" className="text-sm font-medium">
                      Retention Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="retentionName"
                      placeholder="Enter retention name"
                      value={retentionName}
                      onChange={(e) => setRetentionName(e.target.value)}
                      className={`w-full mt-1 ${errors.retentionName ? "border-red-500" : ""}`}
                    />
                    {errors.retentionName && <p className="text-red-500 text-sm mt-1">{errors.retentionName}</p>}
                  </div>

                  <div>
                    <Label htmlFor="retentionCode" className="text-sm font-medium">
                      Retention Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="retentionCode"
                      placeholder="Enter retention code"
                      value={retentionCode}
                      onChange={(e) => setRetentionCode(e.target.value)}
                      className={`w-full mt-1 ${errors.retentionCode ? "border-red-500" : ""}`}
                    />
                    {errors.retentionCode && <p className="text-red-500 text-sm mt-1">{errors.retentionCode}</p>}
                  </div>

                  <div className="space-y-3">
                    {/* For lab_admin, show price input directly. Otherwise, show radio group */}
                    {isLabAdmin ? (
                      <div className="ml-0">
                        <div>
                          <Label htmlFor="price" className="text-sm font-medium">
                            Price <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              className={`pl-8 ${errors.price ? "border-red-500" : ""}`}
                            />
                          </div>
                          {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                        </div>
                      </div>
                    ) : (
                      <RadioGroup value={priceOption} onValueChange={setPriceOption}>
                        {/* <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no-price" id="no-price" />
                          <Label htmlFor="no-price">No additional price</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="with-price" id="with-price" />
                          <Label htmlFor="with-price">Add price</Label>
                        </div>
                        {priceOption === "with-price" && (
                          <div className="ml-6">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className={`pl-8 ${errors.price ? "border-red-500" : ""}`}
                              />
                            </div>
                            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                          </div>
                        )} */}
                      </RadioGroup>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t">
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="bg-[#1162a8] hover:bg-[#0f5496] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Retention"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DiscardChangesDialog
        isOpen={showDiscardDialog}
        type="retention"
        onDiscard={handleDiscard}
        onKeepEditing={() => setShowDiscardDialog(false)}
      />
    </>
  )
}
