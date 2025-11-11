"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ContextErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a context-related error
    if (error.message.includes('useContext') || 
        error.message.includes('Cannot read properties of null') ||
        error.message.includes('usePathname')) {
      return { hasError: true, error }
    }
    return { hasError: false }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Context Error Boundary caught an error:', error, errorInfo)
    
    // Only catch context-related errors
    if (error.message.includes('useContext') || 
        error.message.includes('Cannot read properties of null') ||
        error.message.includes('usePathname')) {
      this.setState({ hasError: true, error })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Loading...
            </h2>
            <p className="text-sm text-gray-600">
              Initializing application context
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
