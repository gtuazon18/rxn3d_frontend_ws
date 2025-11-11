"use client"

import { useCallback } from 'react'

interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  timestamp: string
  userAgent: string
  url: string
  userId?: string
  sessionId?: string
  additionalContext?: Record<string, any>
}

interface ErrorReportingOptions {
  userId?: string
  sessionId?: string
  additionalContext?: Record<string, any>
}

export function useErrorReporting() {
  const reportError = useCallback(async (
    error: Error, 
    errorInfo?: any, 
    options: ErrorReportingOptions = {}
  ) => {
    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      userId: options.userId,
      sessionId: options.sessionId,
      additionalContext: options.additionalContext
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report:', errorReport)
    }

    // In production, you would send this to your error reporting service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: Send to your backend API
        // await fetch('/api/errors', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(errorReport)
        // })

        // Example: Send to external service like Sentry
        // Sentry.captureException(error, {
        //   extra: errorReport
        // })

        console.error('Production Error Report:', errorReport)
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError)
      }
    }
  }, [])

  const reportCustomError = useCallback(async (
    message: string,
    context?: Record<string, any>,
    options: ErrorReportingOptions = {}
  ) => {
    const customError = new Error(message)
    await reportError(customError, null, { ...options, additionalContext: context })
  }, [reportError])

  return {
    reportError,
    reportCustomError
  }
}
