"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"

type SideTabItem = {
  id: string
  label: string
  href: string
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

  const sideTabItems: SideTabItem[] = useMemo(() => [
    { id: "case-pans", label: t("productLibrary.sideBar.CasePans", "Case Pans"), href: `${routePrefix}/case-pans` },
    { id: "products", label: t("productLibrary.sideBar.Products", "Products"), href: `${routePrefix}/products` },
    { id: "product-category", label: t("productLibrary.sideBar.ProductCategory", "Product Category"), href: `${routePrefix}/product-category` },
    { id: "add-ons", label: t("productLibrary.sideBar.AddOns", "Add-ons"), href: `${routePrefix}/add-ons` },
    { id: "add-ons-category", label: t("productLibrary.sideBar.AddOnsCategory", "Add-ons-category"), href: `${routePrefix}/add-ons-category` },
    { id: "stages", label: t("productLibrary.sideBar.Stages", "Stages"), href: `${routePrefix}/stages` },
    { id: "grades", label: t("productLibrary.sideBar.Grades", "Grades"), href: `${routePrefix}/grades` },
    { id: "tooth-mapping", label: t("productLibrary.sideBar.ToothMapping", "Tooth Mapping"), href: `${routePrefix}/tooth-mapping` },
    { id: "impression", label: t("productLibrary.sideBar.Impressions", "Impression"), href: `${routePrefix}/impression` },
    { id: "teeth-shade", label: t("productLibrary.sideBar.TeethShades", "Teeth Shade"), href: `${routePrefix}/teeth-shade` },
    { id: "gum-shade", label: t("productLibrary.sideBar.GumShades", "Gum Shade"), href: `${routePrefix}/gum-shade` },
    { id: "material", label: t("productLibrary.sideBar.Materials", "Material"), href: `${routePrefix}/material` },
    { id: "retention", label: t("productLibrary.sideBar.Retention", "Retention"), href: `${routePrefix}/retention` },
    { id: "visibility-manager", label: t("productLibrary.sideBar.Visibility", "Visibility"), href: `${routePrefix}/visibility-manager` },
  ], [t, routePrefix])

  // Find the active tab only once
  const activeTabHref = useMemo(
    () => sideTabItems.find(item => pathname === item.href)?.href,
    [pathname, sideTabItems]
  )

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  return (
    <div className="w-72 bg-white border-r border-[#d9d9d9]">
      <div className="px-6 py-4 font-bold text-lg border-b border-[#d9d9d9]">{t("productLibrary.productManagementLabel")}</div>
      <div className="overflow-y-auto max-h-[calc(100vh-120px)] product-sidebar-scroll">
        {sideTabItems.map((item) => {
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
