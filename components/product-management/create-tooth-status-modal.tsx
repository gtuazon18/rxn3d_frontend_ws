"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Maximize2, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ColorPicker } from "@/components/ui/color-picker"
import { DiscardChangesDialog } from "@/components/product-management/discard-changes-dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import { useExtractionForm } from "@/hooks/use-extractions"
import { CreateExtractionSchema } from "@/lib/schemas"

// Use the CreateExtractionSchema from schemas.ts
type ToothStatusForm = z.infer<typeof CreateExtractionSchema> & {
  description?: string
}

interface ToothStatus {
  id?: number
  name: string
  color: string
  initial_loading: boolean
  active: boolean
  description?: string
}

interface CreateToothStatusModalProps {
  isOpen: boolean
  onClose: () => void
  onChanges: (hasChanges: boolean) => void
  toothStatus?: ToothStatus | null
  mode: "create" | "edit"
}

export function CreateToothStatusModal({
  isOpen,
  onClose,
  onChanges,
  toothStatus,
  mode,
}: CreateToothStatusModalProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const { t } = useTranslation()

  // Use the extractions API hooks
  const { createExtraction, updateExtraction, isCreating, isUpdating } = useExtractionForm()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, errors },
  } = useForm<ToothStatusForm>({
    resolver: zodResolver(CreateExtractionSchema.extend({
      description: z.string().optional(),
    })),
    defaultValues: {
      name: "",
      description: "",
      code: "",
      color: "#F5E6D3",
      sequence: 1,
      status: "Active",
    },
  })

  const watchedColor = watch("color")
  const watchedName = watch("name")

  // Auto-generate code when name changes
  useEffect(() => {
    if (watchedName && mode === "create") {
      const generatedCode = watchedName
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 10) // Limit to 10 characters
      setValue("code", generatedCode, { shouldDirty: true })
    }
  }, [watchedName, setValue, mode])

  useEffect(() => {
    if (isOpen && toothStatus) {
      reset({
        name: toothStatus.name,
        description: toothStatus.description || "",
        code: toothStatus.name.toUpperCase().replace(/\s+/g, '_').substring(0, 10), // Generate code from name
        color: toothStatus.color,
        sequence: 1,
        status: toothStatus.active ? "Active" : "Inactive",
      })
    } else if (isOpen && !toothStatus) {
      reset({
        name: "",
        description: "",
        code: "",
        color: "#F5E6D3",
        sequence: 1,
        status: "Active",
      })
    }
  }, [isOpen, toothStatus, reset])

  useEffect(() => {
    onChanges(isDirty)
  }, [isDirty, onChanges])

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  const handleClose = () => {
    if (isDirty) {
      setIsDiscardDialogOpen(true)
    } else {
      reset()
      onClose()
    }
  }

  const handleDiscardChanges = () => {
    setIsDiscardDialogOpen(false)
    reset()
    onClose()
  }

  const handleKeepEditing = () => {
    setIsDiscardDialogOpen(false)
  }

  const onSubmit = async (data: ToothStatusForm) => {
    try {
      if (mode === "create") {
        // Create new extraction
        createExtraction({
          name: data.name,
          code: data.code,
          color: data.color,
          sequence: data.sequence,
          status: data.status,
        }, {
          onSuccess: () => {
            reset()
            onClose()
          },
          onError: (error) => {
            console.error("Error creating extraction:", error)
          }
        })
      } else if (mode === "edit" && toothStatus?.id) {
        // Update existing extraction
        updateExtraction({
          id: toothStatus.id,
          data: {
            name: data.name,
            code: data.code,
            color: data.color,
            sequence: data.sequence,
            status: data.status,
          }
        }, {
          onSuccess: () => {
            reset()
            onClose()
          },
          onError: (error) => {
            console.error("Error updating extraction:", error)
          }
        })
      }
    } catch (error) {
      console.error("Error saving tooth status:", error)
    }
  }

  const predefinedColors = [
    "#F5E6D3", // Light beige
    "#D3D3D3", // Light gray
    "#FF6B6B", // Red
    "#808080", // Dark gray
    "#90EE90", // Light green
    "#FFB6C1", // Light pink
    "#D2B48C", // Light brown
    "#ADD8E6", // Light blue
  ]

  const handleColorChange = useCallback((color: string) => {
    setValue("color", color, { shouldDirty: true })
  }, [setValue])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`p-0 gap-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isMaximized 
            ? "w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh]" 
            : "w-full max-w-[600px] max-h-[90vh]"
        } bg-white`}
      >
        <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b bg-white sticky top-0 z-10">
          <DialogTitle className="text-xl font-medium">
            {mode === "edit" ? "Edit tooth status" : "Create tooth status"}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMaximize} 
              className="h-8 w-8 hover:bg-gray-100"
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              <Maximize2 className={`h-4 w-4 transition-transform ${isMaximized ? "rotate-180" : ""}`} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className={`${isMaximized ? "overflow-y-auto" : "overflow-y-auto max-h-[calc(90vh-80px)]"}`}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-6 space-y-6">
              {/* Tooth Status Details Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Tooth Status details</h3>
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                  <Switch
                    checked={true}
                    onCheckedChange={() => {}}
                    className="data-[state=checked]:bg-[#1162a8]"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tooth status name
                    </label>
                    <Input
                      {...register("name")}
                      placeholder="Tooth status name"
                      className="w-full"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code
                    </label>
                    <Input
                      {...register("code")}
                      placeholder="Enter a unique code (e.g., TIM, MT, etc.)"
                      className="w-full"
                    />
                    {errors.code && (
                      <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sequence
                    </label>
                    <Input
                      {...register("sequence", { valueAsNumber: true })}
                      type="number"
                      min="1"
                      placeholder="Sequence order"
                      className="w-full"
                    />
                    {errors.sequence && (
                      <p className="text-red-500 text-sm mt-1">{errors.sequence.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <Textarea
                      {...register("description")}
                      placeholder="Enter your description. This description will appear as a tooltip for the tooth status."
                      className="w-full min-h-[100px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign color
                    </label>
                    <div className="flex items-center gap-3">
                      <ColorPicker
                        value={watchedColor}
                        onChange={handleColorChange}
                        predefinedColors={predefinedColors}
                      />
                      <Input
                        {...register("color")}
                        value={watchedColor}
                        className="w-32"
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      {...register("status")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1162a8] focus:border-[#1162a8]"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    {errors.status && (
                      <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex justify-end gap-3 border-t mt-4 bg-white sticky bottom-0">
              <Button
                variant="destructive"
                type="button" 
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#1162a8] h-10 hover:bg-[#0d4d87]"
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {mode === "edit" ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  mode === "edit" ? "Update Tooth Status" : "Save Tooth Status"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
      
      <DiscardChangesDialog
        isOpen={isDiscardDialogOpen}
        type="tooth-status"
        onDiscard={handleDiscardChanges}
        onKeepEditing={handleKeepEditing}
      />
    </Dialog>
  )
}
