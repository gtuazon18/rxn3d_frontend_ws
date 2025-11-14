"use client"

import { useState, useEffect } from "react"
import { X, Search, Package } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import { useCaseTracking } from "@/contexts/case-tracking-context"
import { ScrollArea } from "@/components/ui/scroll-area"

interface LinkProductModalProps {
  isOpen: boolean
  onClose: () => void
  casePanId?: number
  casePanName?: string
}

// Mock product data - replace with actual API data
const mockProducts = [
  { id: 1, name: "Full denture acrylic", category: "Removables", configured: "all" },
  { id: 2, name: "Immediate denture", category: "Removables", configured: "all" },
  { id: 3, name: "Implant Supported denture", category: "Removables", configured: "all" },
  { id: 4, name: "Acrylic Partial", category: "Removables", configured: "none" },
  { id: 5, name: "Cast Metal Partial", category: "Removables", configured: "some" },
  { id: 6, name: "Flexible/Valplast", category: "Removables", configured: "some" },
  { id: 7, name: "Unilateral Flexible", category: "Removables", configured: "none" },
  { id: 8, name: "Metal Combo Flexible", category: "Removables", configured: "none" },
]

const mockCategories = [
  { id: 1, name: "Removables", productCount: 8 },
  { id: 2, name: "Fixed Prosthetics", productCount: 12 },
  { id: 3, name: "Implants", productCount: 6 },
]

export function LinkProductModal({ isOpen, onClose, casePanId, casePanName }: LinkProductModalProps) {
  const { t } = useTranslation()
  const { linkProducts } = useCaseTracking()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCasePans, setSelectedCasePans] = useState<number[]>([])
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState("individual")

  // Mock case pans for left side
  const mockCasePans = [
    { id: 1, name: "Regular Cases", color: "#1162A8" },
    { id: 2, name: "Other Cases", color: "#11A85D" },
    { id: 3, name: "Appointments", color: "#A81180" },
    { id: 4, name: "Special Cases", color: "#8B0000" },
    { id: 5, name: "3D Denture", color: "#E0E0E0", inactive: true },
  ]

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCasePanToggle = (id: number) => {
    setSelectedCasePans(prev =>
      prev.includes(id) ? prev.filter(panId => panId !== id) : [...prev, id]
    )
  }

  const handleProductToggle = (id: number) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(prodId => prodId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedCasePans.length === mockCasePans.filter(p => !p.inactive).length) {
      setSelectedCasePans([])
    } else {
      setSelectedCasePans(mockCasePans.filter(p => !p.inactive).map(p => p.id))
    }
  }

  const handleClearAll = () => {
    setSelectedCasePans([])
  }

  const handleApply = async () => {
    if (casePanId && selectedProducts.length > 0) {
      await linkProducts(casePanId, selectedProducts)
    }
    onClose()
  }

  const getConfigurationBadge = (status: string) => {
    if (status === "all") {
      return <Badge className="bg-green-100 text-green-700 border-green-300">●</Badge>
    } else if (status === "some") {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">●</Badge>
    } else {
      return <Badge className="bg-gray-100 text-gray-700 border-gray-300">●</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] h-[80vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-medium flex items-center gap-2">
              <div className="bg-[#1162a8] text-white p-2 rounded">
                <Package className="h-5 w-5" />
              </div>
              {t("caseTracking.selectCasePansToAssign", "Select Case pans to assign")}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Case Pans */}
          <div className="w-[300px] border-r bg-gray-50">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold mb-4">{t("caseTracking.selectCasePansToAssign", "Select Case pans to assign")}</h3>
              <div className="flex gap-2 mb-3">
                <Button variant="outline" size="sm" onClick={handleSelectAll} className="flex-1">
                  {t("caseTracking.selectAll", "Select all")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearAll} className="flex-1">
                  {t("caseTracking.clearAll", "Clear all")}
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                {selectedCasePans.length} {t("caseTracking.casePanSelected", "case pan selected")}
              </p>
            </div>

            <ScrollArea className="h-[calc(80vh-200px)]">
              <div className="p-4 space-y-2">
                {mockCasePans.map((casePan) => (
                  <div
                    key={casePan.id}
                    className={`flex items-center gap-3 p-3 rounded border ${
                      casePan.inactive ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white"
                    }`}
                    onClick={() => !casePan.inactive && handleCasePanToggle(casePan.id)}
                  >
                    <Checkbox
                      checked={selectedCasePans.includes(casePan.id)}
                      disabled={casePan.inactive}
                      onCheckedChange={() => handleCasePanToggle(casePan.id)}
                    />
                    <div
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: casePan.color }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{casePan.name}</p>
                      {casePan.inactive && (
                        <Badge variant="outline" className="text-xs mt-1">
                          <span className="text-yellow-600">⚠</span> Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Products */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-[#1162a8] text-white px-4 py-2 rounded flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <span className="font-semibold">{t("caseTracking.assignToTheseProducts", "Assign to These Products")}</span>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="individual">
                    {t("caseTracking.byIndividualProducts", "By Individual Products")}
                  </TabsTrigger>
                  <TabsTrigger value="category">
                    {t("caseTracking.byCategory", "By Category")}
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={t("caseTracking.searchProducts", "Search Products...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <TabsContent value="individual" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <Badge className="bg-green-100 text-green-700 border-green-300">●</Badge>
                      <span>{t("caseTracking.allImageConfigured", "All Image Configured")}</span>
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">●</Badge>
                      <span>{t("caseTracking.someImageConfigured", "Some Image Configured")}</span>
                      <Badge className="bg-gray-100 text-gray-700 border-gray-300">●</Badge>
                      <span>{t("caseTracking.noImageConfigured", "No Image Configured")}</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="category">
                  <p className="text-sm text-gray-600">{t("caseTracking.selectByCategory", "Select products by category")}</p>
                </TabsContent>
              </Tabs>
            </div>

            <ScrollArea className="flex-1">
              {activeTab === "individual" && (
                <div className="p-4">
                  {filteredProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-3 rounded border mb-2 cursor-pointer hover:bg-gray-50 ${
                        index % 2 === 0 ? "bg-blue-50" : "bg-white"
                      }`}
                      onClick={() => handleProductToggle(product.id)}
                    >
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => handleProductToggle(product.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                      {getConfigurationBadge(product.configured)}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "category" && (
                <div className="p-4">
                  {mockCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center gap-3 p-4 rounded border mb-2 cursor-pointer hover:bg-gray-50"
                    >
                      <Checkbox />
                      <div className="flex-1">
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-gray-600">
                          {category.productCount} {t("caseTracking.products", "products")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t("caseTracking.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedCasePans.length === 0}
            className="bg-[#1162a8] hover:bg-[#0f5490]"
          >
            <Package className="h-4 w-4 mr-2" />
            {t("caseTracking.applyCasePansToSelectedProducts", "Apply case pans to selected products")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
