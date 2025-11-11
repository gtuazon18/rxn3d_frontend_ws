import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/toaster"
import { RouteAwareProviders } from "@/components/route-aware-providers"
import { I18nProvider } from "./i18n-provider"
// import { AccessibilitySettings } from "@/components/accessibility-settings"
// import { AccessibilityProvider } from "@/contexts/accessibility-context"
import "./globals.css"
import { ConditionalProviders } from "@/components/conditional-providers"
import { ConditionalClientLayout } from "@/components/conditional-client-layout"
import ReactQueryProvider from '@/components/ReactQueryProvider'
import ClientErrorBoundary from '@/components/client-error-boundary'
import { ContextErrorBoundary } from '@/components/context-error-boundary'
import { PerformanceMonitor } from '@/components/performance-monitor'
import '@/lib/fetch-interceptor' // Global fetch interceptor for 401 handling

export const metadata: Metadata = {
  title: "Rxn3D LMS",
  description: "RxN3D is a digital case management platform for dental labs and offices.",
  icons: {
    icon: "/images/rxn3d-new.png",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <ClientErrorBoundary>
          <ContextErrorBoundary>
            <ReactQueryProvider>
              <RouteAwareProviders>
                {/* <AccessibilityProvider> */}
                <I18nProvider>
                  <ConditionalProviders>
                    <ConditionalClientLayout>
                      {children}
                    </ConditionalClientLayout>
                  </ConditionalProviders>
                </I18nProvider>
                {/* <AccessibilitySettings />
                </AccessibilityProvider> */}
              </RouteAwareProviders>
            </ReactQueryProvider>
            <Toaster />
            {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
          </ContextErrorBoundary>
        </ClientErrorBoundary>
      </body>
    </html>
  )
}
