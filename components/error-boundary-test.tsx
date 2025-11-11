"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Bug, AlertTriangle, Wifi, Shield, Database, Clock, User, Settings } from 'lucide-react'

interface ErrorTestProps {
  onError?: (error: Error) => void
}

// Component that throws different types of errors for testing
function ErrorThrower({ errorType }: { errorType: string }) {
  const [shouldThrow, setShouldThrow] = useState(false)

  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('Network request failed: Unable to connect to server')
      case 'auth':
        throw new Error('Unauthorized: Your session has expired')
      case 'server':
        throw new Error('Internal server error: Database connection failed')
      case 'validation':
        throw new Error('Validation failed: Required field is missing')
      case 'timeout':
        throw new Error('Request timeout: The operation took too long to complete')
      case 'permission':
        throw new Error('Permission denied: You do not have access to this resource')
      case 'generic':
        throw new Error('Something went wrong unexpectedly')
      default:
        throw new Error('Unknown error occurred')
    }
  }

  return (
    <Button 
      onClick={() => setShouldThrow(true)}
      variant="destructive"
      className="w-full"
    >
      <Bug className="h-4 w-4 mr-2" />
      Trigger {errorType} Error
    </Button>
  )
}

export function ErrorBoundaryTest({ onError }: ErrorTestProps) {
  const [selectedErrorType, setSelectedErrorType] = useState('network')

  const errorTypes = [
    { 
      type: 'network', 
      label: 'Network Error', 
      icon: <Wifi className="h-4 w-4" />,
      description: 'Simulates connection issues'
    },
    { 
      type: 'auth', 
      label: 'Authentication Error', 
      icon: <Shield className="h-4 w-4" />,
      description: 'Simulates session expiration'
    },
    { 
      type: 'server', 
      label: 'Server Error', 
      icon: <Database className="h-4 w-4" />,
      description: 'Simulates backend issues'
    },
    { 
      type: 'validation', 
      label: 'Validation Error', 
      icon: <Settings className="h-4 w-4" />,
      description: 'Simulates form validation issues'
    },
    { 
      type: 'timeout', 
      label: 'Timeout Error', 
      icon: <Clock className="h-4 w-4" />,
      description: 'Simulates slow requests'
    },
    { 
      type: 'permission', 
      label: 'Permission Error', 
      icon: <User className="h-4 w-4" />,
      description: 'Simulates access denied'
    },
    { 
      type: 'generic', 
      label: 'Generic Error', 
      icon: <Bug className="h-4 w-4" />,
      description: 'Simulates unexpected errors'
    }
  ]

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Error Boundary Test Component
        </CardTitle>
        <CardDescription>
          This component allows you to test the error boundary by triggering different types of errors.
          Use this in development to verify error handling works correctly.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This component is for testing purposes only. 
            It will cause the error boundary to activate and display the error UI.
          </AlertDescription>
        </Alert>

        <div>
          <h3 className="text-lg font-semibold mb-3">Select Error Type:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {errorTypes.map((errorType) => (
              <Button
                key={errorType.type}
                variant={selectedErrorType === errorType.type ? "default" : "outline"}
                onClick={() => setSelectedErrorType(errorType.type)}
                className="justify-start h-auto p-3"
              >
                <div className="flex items-center gap-2">
                  {errorType.icon}
                  <div className="text-left">
                    <div className="font-medium">{errorType.label}</div>
                    <div className="text-xs opacity-70">{errorType.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Selected Error Type:</h4>
          <Badge variant="outline" className="mb-2">
            {errorTypes.find(et => et.type === selectedErrorType)?.label}
          </Badge>
          <p className="text-sm text-gray-600">
            {errorTypes.find(et => et.type === selectedErrorType)?.description}
          </p>
        </div>

        <div className="border-2 border-dashed border-red-200 rounded-lg p-4">
          <h4 className="font-medium text-red-700 mb-2">Error Boundary Test Area</h4>
          <p className="text-sm text-gray-600 mb-3">
            Click the button below to trigger the selected error type and see how the error boundary handles it.
          </p>
          <ErrorThrower errorType={selectedErrorType} />
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Note:</strong> After triggering an error, you can:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Use "Try Again" to reset the error boundary</li>
            <li>Use "Reload Page" to refresh the entire page</li>
            <li>Use "Go Home" to navigate to the home page</li>
            <li>In development, use "Show Details" to see technical information</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
