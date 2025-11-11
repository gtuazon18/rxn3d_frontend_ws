"use client"

import ErrorBoundaryWithRouter from './error-boundary'

interface ClientErrorBoundaryProps {
  children: React.ReactNode
}

export default function ClientErrorBoundary({ children }: ClientErrorBoundaryProps) {
  return (
    <ErrorBoundaryWithRouter
      onError={(error, errorInfo) => {
        // Log error to external service in production
        if (process.env.NODE_ENV === 'production') {
          console.error('Application Error:', {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
            url: typeof window !== 'undefined' ? window.location.href : 'SSR'
          })
          // Here you could send to error reporting service like Sentry, LogRocket, etc.
        }
      }}
    >
      {children}
    </ErrorBoundaryWithRouter>
  )
}
