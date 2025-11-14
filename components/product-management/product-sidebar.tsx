"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

type SideTabItem = {
  id: string
  label: string
  href: string
  children?: SideTabItem[]
}

type SidebarGroup = {
  id: string
  label: string
  items: SideTabItem[]
}

interface ProductSidebarProps {
  activeTab?: string
  onTabChange?: (tabId: string) => void
}

export function ProductSidebar({ activeTab = "products", onTabChange }: ProductSidebarProps) {
  const pathname = usePathname() || "";
  const { t } = useTranslation()
  const { user } = useAuth()

  // Get user role from auth context
  const userRoles = user?.roles || (user?.role ? [user.role] : [])
  const isLabAdmin = userRoles.includes("lab_admin")

  // Set route prefix based on user role
  const routePrefix = isLabAdmin ? "/lab-product-library" : "/global-product-library"

  const sidebarGroups: SidebarGroup[] = useMemo(() => [
    {
      id: "products",
      label: t("productLibrary.sideBar.Products", "Products"),
      items: [
        { id: "products", label: t("productLibrary.sideBar.Products", "Products"), href: `${routePrefix}/products` },
        { id: "product-category", label: t("productLibrary.sideBar.Category", "Category"), href: `${routePrefix}/product-category` },
        { id: "product-sub-category", label: t("productLibrary.sideBar.SubCategory", "Sub Category"), href: `${routePrefix}/product-sub-category` },
      ]
    },
    {
      id: "addons",
      label: t("productLibrary.sideBar.AddOns", "Add-ons"),
      items: [
        { id: "add-ons-category", label: t("productLibrary.sideBar.Category", "Category"), href: `${routePrefix}/add-ons-category` },
        { id: "add-ons-sub-category", label: t("productLibrary.sideBar.SubCategory", "Sub category"), href: `${routePrefix}/add-ons-sub-category` },
        { id: "add-ons", label: t("productLibrary.sideBar.AddOns", "Add-ons"), href: `${routePrefix}/add-ons` },
      ]
    },
  ], [t, routePrefix])

  // Flat items (single tabs, not in accordion)
  const flatItems: SideTabItem[] = useMemo(() => [
    { id: "case-pans", label: t("productLibrary.sideBar.CasePans", "Case Pans"), href: `${routePrefix}/case-pans` },
    { id: "stages", label: t("productLibrary.sideBar.Stages", "Stages"), href: `${routePrefix}/stages` },
    { id: "grades", label: t("productLibrary.sideBar.Grades", "Grades"), href: `${routePrefix}/grades` },
    { id: "tooth-mapping", label: t("productLibrary.sideBar.ToothMapping", "Tooth Mapping"), href: `${routePrefix}/tooth-mapping` },
    { id: "impression", label: t("productLibrary.sideBar.Impressions", "Impression"), href: `${routePrefix}/impression` },
    { id: "teeth-shade", label: t("productLibrary.sideBar.TeethShades", "Teeth Shade"), href: `${routePrefix}/teeth-shade` },
    { id: "gum-shade", label: t("productLibrary.sideBar.GumShades", "Gum Shade"), href: `${routePrefix}/gum-shade` },
    { id: "material", label: t("productLibrary.sideBar.Materials", "Material"), href: `${routePrefix}/material` },
    { id: "retention", label: t("productLibrary.sideBar.Retention", "Retention"), href: `${routePrefix}/retention` },
  ], [t, routePrefix])

  // Flatten all items to find active tab
  const allItems = useMemo(() => 
    [...sidebarGroups.flatMap(group => group.items), ...flatItems],
    [sidebarGroups, flatItems]
  )

  // Find the active tab only once
  const activeTabHref = useMemo(
    () => allItems.find(item => pathname === item.href)?.href,
    [pathname, allItems]
  )

  // Find which accordion should be open based on active path
  const defaultOpenAccordion = useMemo(() => {
    if (!activeTabHref) return undefined
    const activeItem = allItems.find(item => item.href === activeTabHref)
    if (!activeItem) return undefined
    return sidebarGroups.find(group => 
      group.items.some(item => item.id === activeItem.id)
    )?.id
  }, [activeTabHref, allItems, sidebarGroups])

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  return (
    <div className="w-72 bg-white border-r border-[#d9d9d9]">
      <div className="px-6 py-4 font-bold text-lg border-b border-[#d9d9d9]">{t("productLibrary.productManagementLabel")}</div>
      <div className="overflow-y-auto max-h-[calc(100vh-120px)] product-sidebar-scroll">
        <Accordion 
          type="single" 
          collapsible 
          defaultValue={defaultOpenAccordion}
          className="w-full"
        >
          {sidebarGroups.map((group) => {
            const hasActiveItem = group.items.some(item => item.href === activeTabHref)
            
            return (
              <AccordionItem 
                key={group.id} 
                value={group.id} 
                className="border-none"
              >
                <AccordionTrigger 
                  className={cn(
                    "px-6 py-4 text-base font-medium hover:no-underline",
                    hasActiveItem ? "bg-[#dfeefb] text-[#1162a8]" : "text-[#000000] hover:bg-gray-100"
                  )}
                >
                  {group.label}
                </AccordionTrigger>
                <AccordionContent className="pb-0 pt-0">
                  <div className="flex flex-col">
                    {group.items.map((item) => {
                      const isActive = activeTabHref === item.href
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          prefetch={true}
                          className={cn(
                            "block px-6 py-3 text-sm transition-colors font-medium",
                            isActive ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8]" : "text-[#000000] hover:bg-gray-100",
                          )}
                          onClick={() => handleTabClick(item.id)}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
        {/* Flat items (single tabs) */}
        {flatItems.map((item) => {
          const isActive = activeTabHref === item.href
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              className={cn(
                "block px-6 py-4 text-base transition-colors font-medium",
                isActive ? "bg-[#dfeefb] text-[#1162a8] border-l-4 border-[#1162a8]" : "text-[#000000] hover:bg-gray-100",
              )}
              onClick={() => handleTabClick(item.id)}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <style jsx>{`
        .product-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: #1162a8 #e5e7eb;
        }
        .product-sidebar-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .product-sidebar-scroll::-webkit-scrollbar-track {
          background: #e5e7eb;
          border-radius: 4px;
        }
        .product-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #1162a8;
          border-radius: 4px;
        }
        .product-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #0f5490;
        }
      `}</style>
    </div>
  )
}
