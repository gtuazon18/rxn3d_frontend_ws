"use client"

import React, { type ReactNode, type ErrorInfo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  Copy, 
  ExternalLink,
  Wifi,
  Database,
  Shield,
  Clock,
  User,
  Settings
} from "lucide-react"
import { useRouter } from "next/navigation"

interface Props {
  children: ReactNode
  fallbackMessage?: string
  router?: any
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
  lastErrorTime: number
}

interface ErrorCategory {
  type: string
  icon: React.ReactNode
  title: string
  description: string
  solutions: string[]
  severity: "low" | "medium" | "high" | "critical"
}

class ErrorBoundary extends React.Component<Props, State> {
  private debounceTimer: NodeJS.Timeout | null = null
  
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    lastErrorTime: 0,
  }

  static getDerivedStateFromError(error: Error) {
    const now = Date.now()
    return { hasError: true, error, showDetails: false, lastErrorTime: now }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now()
    const DEBOUNCE_TIME = 1000 // 1 second debounce
    
    // Prevent infinite loops and debounce rapid error updates
    if (this.state.hasError && this.state.error === error) {
      return
    }
    
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    
    // Debounce: only update if enough time has passed since last error
    if (this.state.lastErrorTime && (now - this.state.lastErrorTime) < DEBOUNCE_TIME) {
      // Set a timer to handle the error after debounce period
      this.debounceTimer = setTimeout(() => {
        this.handleErrorUpdate(error, errorInfo, now)
      }, DEBOUNCE_TIME - (now - this.state.lastErrorTime))
      return
    }
    
    this.handleErrorUpdate(error, errorInfo, now)
  }
  
  private handleErrorUpdate = (error: Error, errorInfo: ErrorInfo, timestamp: number) => {
    this.setState({ error, errorInfo, lastErrorTime: timestamp })
    
    // Log error for debugging
    console.error("Error boundary caught an error:", error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Handle specific error types
    if (error.message.includes("Unauthorized") && this.props.router) {
      this.props.router.push("/login")
    }
  }

  componentWillUnmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }

  handleResetError = () => {
    // Clear any pending debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false, lastErrorTime: 0 })
  }

  handleGoHome = () => {
    if (this.props.router) {
      this.props.router.push("/")
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  getErrorCategory = (error: Error): ErrorCategory => {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ""

    // React-specific errors
    if (message.includes("maximum update depth exceeded") || message.includes("infinite loop")) {
      return {
        type: "react-infinite-loop",
        icon: <Bug className="h-5 w-5" />,
        title: "React State Loop Error",
        description: "The application got stuck in an infinite update loop. This usually happens when state updates trigger more state updates.",
        solutions: [
          "Refresh the page to reset the application state",
          "Clear your browser cache and cookies",
          "Try using a different browser",
          "Contact support with the error details below"
        ],
        severity: "high"
      }
    }

    // Hook-related errors
    if (message.includes("invalid hook call") || message.includes("hooks can only be called")) {
      return {
        type: "react-hooks",
        icon: <Bug className="h-5 w-5" />,
        title: "React Hooks Error",
        description: "There was an issue with React hooks usage. This is a development error that needs to be fixed.",
        solutions: [
          "Refresh the page to reset the application",
          "Clear your browser cache",
          "Try using a different browser",
          "Contact support with the error details below"
        ],
        severity: "high"
      }
    }

    // Chunk loading errors (common in Next.js)
    if (message.includes("chunk") || message.includes("loading chunk") || message.includes("failed to import")) {
      return {
        type: "chunk-loading",
        icon: <RefreshCw className="h-5 w-5" />,
        title: "Application Loading Error",
        description: "Failed to load part of the application. This often happens after updates.",
        solutions: [
          "Refresh the page to reload the application",
          "Clear your browser cache completely",
          "Try using a different browser",
          "Contact support if the problem persists"
        ],
        severity: "medium"
      }
    }

    // Network/API errors
    if (message.includes("network") || message.includes("fetch") || message.includes("timeout")) {
      return {
        type: "network",
        icon: <Wifi className="h-5 w-5" />,
        title: "Network Connection Error",
        description: "There was a problem connecting to the server or loading data.",
        solutions: [
          "Check your internet connection",
          "Try refreshing the page",
          "Wait a moment and try again",
          "Contact support if the problem persists"
        ],
        severity: "medium"
      }
    }

    // Authentication errors
    if (message.includes("unauthorized") || message.includes("401") || message.includes("forbidden")) {
      return {
        type: "auth",
        icon: <Shield className="h-5 w-5" />,
        title: "Authentication Error",
        description: "Your session has expired or you don't have permission to access this resource.",
        solutions: [
          "Log out and log back in",
          "Clear your browser cache and cookies",
          "Check if your account has the required permissions",
          "Contact your administrator if you believe this is an error"
        ],
        severity: "high"
      }
    }

    // Database/Server errors
    if (message.includes("500") || message.includes("database") || message.includes("server")) {
      return {
        type: "server",
        icon: <Database className="h-5 w-5" />,
        title: "Server Error",
        description: "There was a problem on our servers. This is not your fault.",
        solutions: [
          "Try again in a few minutes",
          "Refresh the page",
          "Contact support if the problem continues",
          "Check our status page for known issues"
        ],
        severity: "high"
      }
    }

    // Validation errors
    if (message.includes("validation") || message.includes("invalid") || message.includes("required")) {
      return {
        type: "validation",
        icon: <Settings className="h-5 w-5" />,
        title: "Validation Error",
        description: "The data you entered doesn't meet the required format or criteria.",
        solutions: [
          "Check all required fields are filled",
          "Verify the format of your input",
          "Make sure all data is valid",
          "Try submitting again with corrected information"
        ],
        severity: "low"
      }
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("slow")) {
      return {
        type: "timeout",
        icon: <Clock className="h-5 w-5" />,
        title: "Request Timeout",
        description: "The request took too long to complete.",
        solutions: [
          "Check your internet connection speed",
          "Try again with a smaller amount of data",
          "Wait a moment and retry",
          "Contact support if timeouts persist"
        ],
        severity: "medium"
      }
    }

    // User permission errors
    if (message.includes("permission") || message.includes("access denied") || message.includes("403")) {
      return {
        type: "permission",
        icon: <User className="h-5 w-5" />,
        title: "Permission Denied",
        description: "You don't have the necessary permissions to perform this action.",
        solutions: [
          "Contact your administrator for access",
          "Check if your role has the required permissions",
          "Verify you're logged into the correct account",
          "Request permission from your supervisor"
        ],
        severity: "medium"
      }
    }

    // JavaScript/TypeScript errors
    if (message.includes("typeerror") || message.includes("referenceerror") || message.includes("syntaxerror")) {
      return {
        type: "javascript-error",
        icon: <Bug className="h-5 w-5" />,
        title: "JavaScript Error",
        description: "There was a programming error in the application code.",
        solutions: [
          "Refresh the page to reload the application",
          "Clear your browser cache and cookies",
          "Try using a different browser",
          "Contact support with the error details below"
        ],
        severity: "high"
      }
    }

    // Memory/Performance errors
    if (message.includes("out of memory") || message.includes("memory") || message.includes("performance")) {
      return {
        type: "memory-error",
        icon: <Database className="h-5 w-5" />,
        title: "Memory Error",
        description: "The application ran out of memory or encountered a performance issue.",
        solutions: [
          "Close other browser tabs to free up memory",
          "Refresh the page to reset the application",
          "Try using a different browser",
          "Contact support if the problem persists"
        ],
        severity: "medium"
      }
    }

    // File/Upload errors
    if (message.includes("file") || message.includes("upload") || message.includes("download")) {
      return {
        type: "file-error",
        icon: <Settings className="h-5 w-5" />,
        title: "File Operation Error",
        description: "There was a problem with a file operation (upload, download, or processing).",
        solutions: [
          "Check if the file is in the correct format",
          "Try uploading a smaller file",
          "Refresh the page and try again",
          "Contact support with the file details"
        ],
        severity: "medium"
      }
    }

    // Default case - make it more descriptive based on error characteristics
    const errorName = error.name || "Error"
    const hasStack = stack.length > 0
    const isDevelopment = process.env.NODE_ENV === "development"
    
    return {
      type: "application-error",
      icon: <Bug className="h-5 w-5" />,
      title: `${errorName} - Application Error`,
      description: hasStack 
        ? "An unexpected error occurred in the application. The development team has been notified."
        : "Something went wrong that we didn't expect. Please try the solutions below.",
      solutions: [
        "Try refreshing the page",
        "Clear your browser cache and cookies",
        "Try using a different browser",
        isDevelopment 
          ? "Check the browser console for more details"
          : "Contact support with the error details below"
      ],
      severity: "high"
    }
  }

  getErrorTypeDisplayName = (type: string): string => {
    switch (type) {
      case "react-infinite-loop": return "React State Loop"
      case "react-hooks": return "React Hooks Error"
      case "chunk-loading": return "Application Loading"
      case "network": return "Network Connection"
      case "auth": return "Authentication"
      case "server": return "Server Error"
      case "validation": return "Data Validation"
      case "timeout": return "Request Timeout"
      case "permission": return "Access Permission"
      case "javascript-error": return "JavaScript Error"
      case "memory-error": return "Memory Issue"
      case "file-error": return "File Operation"
      case "application-error": return "Application Error"
      default: return "Unknown Error"
    }
  }

  getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "bg-green-100 text-green-800 border-green-200"
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "high": return "bg-orange-100 text-orange-800 border-orange-200"
      case "critical": return "bg-red-100 text-red-800 border-red-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  copyErrorDetails = () => {
    const { error, errorInfo } = this.state
    const errorDetails = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
  }

  render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallbackMessage } = this.props
    const isDevelopment = process.env.NODE_ENV === "development"

    if (hasError && error) {
      const errorCategory = this.getErrorCategory(error)
      const { showDetails } = this.state

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {errorCategory.title}
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                {errorCategory.description}
              </CardDescription>
              <div className="flex justify-center mt-4">
                <Badge 
                  variant="outline" 
                  className={`${this.getSeverityColor(errorCategory.severity)} border`}
                >
                  {errorCategory.severity.toUpperCase()} SEVERITY
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Category Info */}
              <Alert>
                <div className="flex items-center gap-2">
                  {errorCategory.icon}
                  <AlertDescription className="font-medium">
                    Error Type: {this.getErrorTypeDisplayName(errorCategory.type)}
                  </AlertDescription>
                </div>
              </Alert>

              {/* Solutions */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">How to Fix This:</h3>
                <ul className="space-y-2">
                  {errorCategory.solutions.map((solution, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-600 font-bold">{index + 1}.</span>
                      <span>{solution}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={this.handleResetError} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                {isDevelopment && (
                  <Button 
                    onClick={() => this.setState({ showDetails: !showDetails })} 
                    variant="outline"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    {showDetails ? "Hide" : "Show"} Details
                  </Button>
                )}
              </div>

              {/* Technical Details (Development Only) */}
              {isDevelopment && showDetails && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Technical Details</h4>
                    <Button 
                      onClick={this.copyErrorDetails} 
                      variant="outline" 
                      size="sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Details
                    </Button>
                  </div>
                  
                  <div className="space-y-4 text-sm">
                    <div>
                      <strong>Error Message:</strong>
                      <pre className="mt-1 p-2 bg-white rounded border text-red-600 overflow-x-auto">
                        {error.message}
                      </pre>
                    </div>
                    
                    {error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 p-2 bg-white rounded border text-gray-600 overflow-x-auto max-h-40">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 p-2 bg-white rounded border text-gray-600 overflow-x-auto max-h-40">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Support Information */}
              <div className="text-center text-sm text-gray-500">
                <p>
                  If this problem continues, please contact our support team with the error details above.
                </p>
                <p className="mt-1">
                  Error ID: {Date.now().toString(36)}-{Math.random().toString(36).substr(2, 9)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return children
  }
}

// Use a HOC to inject router if needed
export default function ErrorBoundaryWithRouter(props: Props) {
  const router = useRouter()
  return <ErrorBoundary {...props} router={router} />
}
