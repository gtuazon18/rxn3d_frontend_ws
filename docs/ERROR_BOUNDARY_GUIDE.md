# Error Boundary System Guide

This guide explains how to use the comprehensive error boundary system implemented in the RXN3D application.

## Overview

The error boundary system provides:
- **Detailed error categorization** with specific guidance for different error types
- **User-friendly error messages** with actionable solutions
- **Automatic error recovery** mechanisms
- **Comprehensive error reporting** and logging
- **Development tools** for testing and debugging

## Components

### 1. ErrorBoundaryWithRouter

The main error boundary component that wraps your application and catches React errors.

**Location:** `components/error-boundary.tsx`

**Features:**
- Categorizes errors by type (network, auth, server, validation, timeout, permission, unknown)
- Provides specific guidance for each error type
- Shows severity levels (low, medium, high, critical)
- Includes recovery actions (Try Again, Reload Page, Go Home)
- Development-only technical details with copy functionality
- Generates unique error IDs for support tracking

**Usage:**
```tsx
import ErrorBoundaryWithRouter from '@/components/error-boundary'

<ErrorBoundaryWithRouter
  onError={(error, errorInfo) => {
    // Custom error handling logic
    console.error('Application Error:', error)
  }}
>
  <YourApp />
</ErrorBoundaryWithRouter>
```

### 2. Error Reporting Hook

**Location:** `hooks/use-error-reporting.ts`

Provides utilities for reporting errors to external services.

**Usage:**
```tsx
import { useErrorReporting } from '@/hooks/use-error-reporting'

function MyComponent() {
  const { reportError, reportCustomError } = useErrorReporting()

  const handleError = async (error: Error) => {
    await reportError(error, null, {
      userId: 'user123',
      sessionId: 'session456',
      additionalContext: { component: 'MyComponent' }
    })
  }

  const handleCustomError = async () => {
    await reportCustomError('Custom error message', {
      action: 'button_click',
      timestamp: Date.now()
    })
  }
}
```

### 3. Error Recovery Utilities

**Location:** `utils/error-recovery.ts`

Provides automatic error recovery with retry logic and user-friendly error handling.

**Usage:**
```tsx
import { errorRecoveryUtils, errorRecovery } from '@/utils/error-recovery'

// Wrap operations with automatic recovery
const result = await errorRecoveryUtils.withRecovery(
  async () => {
    return await fetchData()
  },
  {
    maxRetries: 3,
    retryDelay: 1000,
    showToast: true,
    onRetry: () => console.log('Retrying...'),
    onSuccess: () => console.log('Success!'),
    onFailure: (error) => console.log('Failed:', error)
  }
)

// Get user-friendly error messages
const { message, suggestions } = errorRecoveryUtils.getUserFriendlyMessage(error)

// Check if error is recoverable
const isRecoverable = errorRecovery.isRecoverableError(error)
```

### 4. Error Boundary Test Component

**Location:** `components/error-boundary-test.tsx`

A development tool for testing different error scenarios.

**Usage:**
```tsx
import { ErrorBoundaryTest } from '@/components/error-boundary-test'

// Add to a development page
<ErrorBoundaryTest />
```

## Error Categories

The system automatically categorizes errors and provides specific guidance:

### Network Errors
- **Triggers:** `network`, `fetch`, `timeout` in error message
- **Severity:** Medium
- **Solutions:** Check connection, refresh page, wait and retry

### Authentication Errors
- **Triggers:** `unauthorized`, `401`, `forbidden` in error message
- **Severity:** High
- **Solutions:** Log out/in, clear cache, check permissions

### Server Errors
- **Triggers:** `500`, `database`, `server` in error message
- **Severity:** High
- **Solutions:** Wait and retry, contact support, check status page

### Validation Errors
- **Triggers:** `validation`, `invalid`, `required` in error message
- **Severity:** Low
- **Solutions:** Check required fields, verify input format

### Timeout Errors
- **Triggers:** `timeout`, `slow` in error message
- **Severity:** Medium
- **Solutions:** Check connection speed, retry with less data

### Permission Errors
- **Triggers:** `permission`, `access denied`, `403` in error message
- **Severity:** Medium
- **Solutions:** Contact administrator, check role permissions

### Unknown Errors
- **Triggers:** Any error that doesn't match above categories
- **Severity:** High
- **Solutions:** Refresh page, clear cache, contact support

## Integration

### 1. Layout Integration

The error boundary is already integrated into the main layout (`app/layout.tsx`):

```tsx
<ErrorBoundaryWithRouter
  onError={(error, errorInfo) => {
    if (process.env.NODE_ENV === 'production') {
      // Log to external service
      console.error('Application Error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      })
    }
  }}
>
  {/* Your app content */}
</ErrorBoundaryWithRouter>
```

### 2. Component-Level Error Handling

For specific components that need custom error handling:

```tsx
import { errorRecoveryUtils } from '@/utils/error-recovery'

function MyComponent() {
  const handleAsyncOperation = async () => {
    try {
      const result = await someAsyncOperation()
      return result
    } catch (error) {
      const { message, suggestions } = errorRecoveryUtils.getUserFriendlyMessage(error)
      
      toast({
        title: message,
        description: suggestions[0],
        variant: "destructive"
      })
      
      errorRecoveryUtils.logError(error, { component: 'MyComponent' })
    }
  }
}
```

### 3. API Error Handling

For API calls with automatic retry:

```tsx
import { errorRecoveryUtils } from '@/utils/error-recovery'

const fetchData = async () => {
  return errorRecoveryUtils.withRecovery(
    async () => {
      const response = await fetch('/api/data')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response.json()
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      showToast: true
    }
  )
}
```

## Best Practices

### 1. Error Message Guidelines
- Use clear, user-friendly language
- Avoid technical jargon
- Provide actionable solutions
- Include relevant context

### 2. Error Reporting
- Always log errors in development
- Use structured logging in production
- Include relevant context (user ID, session, component)
- Don't log sensitive information

### 3. Recovery Strategies
- Implement exponential backoff for retries
- Provide fallback UI when possible
- Allow users to manually retry
- Clear error state after successful recovery

### 4. Testing
- Use the ErrorBoundaryTest component in development
- Test different error scenarios
- Verify error messages are helpful
- Ensure recovery mechanisms work

## Configuration

### Environment Variables

```env
NODE_ENV=development  # Shows technical details in error boundary
```

### Custom Error Categories

To add custom error categories, modify the `getErrorCategory` method in `error-boundary.tsx`:

```tsx
// Add new error type
if (message.includes('custom_error_type')) {
  return {
    type: "custom",
    icon: <CustomIcon className="h-5 w-5" />,
    title: "Custom Error",
    description: "Description of the custom error.",
    solutions: [
      "Solution 1",
      "Solution 2"
    ],
    severity: "medium"
  }
}
```

## Monitoring and Analytics

### Error Tracking Integration

To integrate with external error tracking services:

```tsx
// In the error boundary onError callback
onError={(error, errorInfo) => {
  // Sentry integration
  Sentry.captureException(error, {
    extra: {
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    }
  })

  // LogRocket integration
  LogRocket.captureException(error)

  // Custom analytics
  analytics.track('Error Boundary Triggered', {
    errorMessage: error.message,
    errorType: getErrorCategory(error).type,
    severity: getErrorCategory(error).severity
  })
}}
```

## Troubleshooting

### Common Issues

1. **Error boundary not catching errors**
   - Ensure the error boundary wraps the component tree
   - Check that errors are thrown during render, not in event handlers

2. **Error messages not showing**
   - Verify the error boundary is properly integrated
   - Check console for JavaScript errors

3. **Recovery not working**
   - Ensure the error state is properly reset
   - Check that the operation is retryable

### Debug Mode

In development, the error boundary shows additional technical details:
- Full error stack trace
- Component stack trace
- Copy error details functionality
- Show/hide details toggle

## Support

For issues with the error boundary system:
1. Check the browser console for additional errors
2. Use the ErrorBoundaryTest component to reproduce issues
3. Review the error logs and context
4. Contact the development team with error details

## Future Enhancements

Potential improvements to consider:
- Integration with external error tracking services (Sentry, LogRocket)
- User feedback collection on error pages
- Automatic error reporting to backend
- Error analytics and monitoring dashboard
- A/B testing for error message effectiveness
