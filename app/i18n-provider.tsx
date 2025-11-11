"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { I18nextProvider } from "react-i18next"
import i18n from "@/lib/i18n"
import { LanguageProvider } from "@/contexts/language-context"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Wait for i18n to be ready before rendering children
    if (i18n.isInitialized) {
      setIsReady(true)
    } else {
      i18n.on("initialized", () => {
        setIsReady(true)
      })
    }
  }, [])

  // Render children immediately, i18n will load translations in background
  // This prevents blocking the initial render
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nextProvider>
  )
}
