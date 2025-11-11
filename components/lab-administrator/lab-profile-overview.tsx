"use client"

import { useState, useRef, useEffect } from "react"
import { Edit, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useCustomer } from "@/contexts/customer-context"
import { useCustomerLogoStore } from "@/stores/customer-logo-store"

interface OverviewTabProps {
  labData: {
    name: string
    id: string
    number: string
    email: string
    address: string
    website: string
    contactName: string
    contactEmail: string
    contactNumber: string
    joiningDate: string
    position: string
    logo_url?: string
  }
  onLogoUpdate?: (logoUrl: string) => void
  onProfileUpdate?: () => void
}

export default function OverviewTab({ labData, onLogoUpdate, onProfileUpdate }: OverviewTabProps) {
  const [logoUrl, setLogoUrl] = useState<string>(labData.logo_url || "/images/hmcinnovs.png")
  const [isUploading, setIsUploading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { updateCustomerProfile } = useCustomer()
  const { setCustomerLogo, setCurrentCustomerLogo } = useCustomerLogoStore()

  // Form state - parse address on mount
  const parseAddress = (addressString: string) => {
    const parts = addressString.split(',').map(p => p.trim()).filter(Boolean)
    return {
      address: parts[0] || "",
      city: parts[1] || "",
      postal_code: parts[2] || "",
    }
  }

  const [formData, setFormData] = useState(() => {
    const parsed = parseAddress(labData.address)
    return {
      name: labData.name,
      email: labData.email,
      website: labData.website || "",
      address: parsed.address,
      city: parsed.city,
      postal_code: parsed.postal_code,
    }
  })

  // Update form data when labData changes
  useEffect(() => {
    const parsed = parseAddress(labData.address)
    setFormData({
      name: labData.name,
      email: labData.email,
      website: labData.website || "",
      address: parsed.address,
      city: parsed.city,
      postal_code: parsed.postal_code,
    })
  }, [labData])

  // Update logo URL when labData changes
  useEffect(() => {
    if (labData.logo_url) {
      setLogoUrl(labData.logo_url)
    } else {
      setLogoUrl("/images/hmcinnovs.png")
    }
  }, [labData.logo_url])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, JPEG, or SVG file.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (1MB max)
    const maxSize = 1 * 1024 * 1024 // 1MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must not exceed 1MB.",
        variant: "destructive",
      })
      return
    }

    // Upload the file
    await uploadLogo(file)
  }

  const uploadLogo = async (file: File) => {
    setIsUploading(true)
    try {
      const customerId = labData.id
      const token = localStorage.getItem('token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Create FormData for multipart form submission
      const formData = new FormData()
      formData.append('logo', file)

      // Upload the logo
      const response = await fetch(`${apiBaseUrl}/customers/${customerId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
        },
        body: formData,
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to upload logo: ${response.status}`)
      }

      const result = await response.json()
      const newLogoUrl = result.data?.logo_url || result.logo_url

      if (newLogoUrl) {
        setLogoUrl(newLogoUrl)
        
        // Update Zustand store and localStorage
        const customerId = labData.id
        setCustomerLogo(customerId, newLogoUrl)
        setCurrentCustomerLogo(newLogoUrl)
        
        if (onLogoUpdate) {
          onLogoUpdate(newLogoUrl)
        }
        toast({
          title: "Success",
          description: "Logo uploaded successfully",
        })
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleEditClick = () => {
    setIsEditModalOpen(true)
    // Initialize form with current data
    const parsed = parseAddress(labData.address)
    setFormData({
      name: labData.name,
      email: labData.email,
      website: labData.website || "",
      address: parsed.address,
      city: parsed.city,
      postal_code: parsed.postal_code,
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Send address fields separately as the API expects
      const updateData: any = {
        name: formData.name,
        email: formData.email,
      }

      // Only include optional fields if they have values
      if (formData.website) {
        updateData.website = formData.website
      }
      if (formData.address) {
        updateData.address = formData.address
      }
      if (formData.city) {
        updateData.city = formData.city
      }
      if (formData.postal_code) {
        updateData.postal_code = formData.postal_code
      }

      const result = await updateCustomerProfile(Number(labData.id), updateData)
      
      if (result) {
        setIsEditModalOpen(false)
        if (onProfileUpdate) {
          onProfileUpdate()
        }
      }
    } catch (error: any) {
      console.error("Error updating profile:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6">
      <Card className="">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Lab Info
            <button 
              onClick={handleEditClick}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit Lab Info"
            >
              <Edit className="h-4 w-4" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-blue-200 flex items-center justify-center bg-blue-50 overflow-hidden">
                <img 
                  src={logoUrl} 
                  alt={`${labData.name} Logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to default logo if image fails to load
                    e.currentTarget.src = "/images/hmcinnovs.png"
                  }}
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpg,image/jpeg,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                size="sm" 
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Lab Name:</label>
                <p className="font-medium text-sm">{labData.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Lab ID:</label>
                <p className="font-medium text-sm">{labData.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Lab Number:</label>
                <p className="font-medium text-sm">{labData.number}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Lab email:</label>
                <p className="font-medium text-sm">{labData.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Address:</label>
                <p className="font-medium text-sm">{labData.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Website:</label>
                <p className="font-medium text-blue-600 text-sm">{labData.website}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact Name:</label>
                <p className="font-medium text-sm">{labData.contactName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact Email:</label>
                <p className="font-medium text-sm">{labData.contactEmail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact number:</label>
                <p className="font-medium text-sm">{labData.contactNumber}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Joining Date:</label>
                <p className="font-medium text-sm">{labData.joiningDate}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Position:</label>
                <p className="font-medium text-sm">{labData.position}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lab Information</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Lab Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter lab name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>

              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="Enter postal code"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.name || !formData.email}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
