import { useState, useEffect, useCallback } from 'react'
import { OnboardingApiService, OnboardingStatus } from '@/lib/api-onboarding'
import { useAuth } from '@/contexts/auth-context'

export interface UseOnboardingStatusReturn {
  onboardingStatus: OnboardingStatus | null
  isOnboardingComplete: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  markBusinessHoursComplete: () => Promise<void>
}

export function useOnboardingStatus(): UseOnboardingStatusReturn {
  const { user } = useAuth()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOnboardingStatus = useCallback(async () => {
    if (!user?.customer_id) {
      setOnboardingStatus(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await OnboardingApiService.getOnboardingStatus(user.customer_id)
      setOnboardingStatus(response.data)
    } catch (err) {
      console.error('Error fetching onboarding status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch onboarding status')
    } finally {
      setIsLoading(false)
    }
  }, [user?.customer_id])

  const markBusinessHoursComplete = useCallback(async () => {
    if (!user?.customer_id) return

    try {
      await OnboardingApiService.markBusinessHoursSetupCompleted(user.customer_id)
      // Refetch the status after marking as complete
      await fetchOnboardingStatus()
    } catch (err) {
      console.error('Error marking business hours as complete:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark business hours as complete')
    }
  }, [user?.customer_id, fetchOnboardingStatus])

  useEffect(() => {
    fetchOnboardingStatus()
  }, [fetchOnboardingStatus])

  const isOnboardingComplete = onboardingStatus?.onboarding_completed && 
                               onboardingStatus?.business_hours_setup_completed

  return {
    onboardingStatus,
    isOnboardingComplete: !!isOnboardingComplete,
    isLoading,
    error,
    refetch: fetchOnboardingStatus,
    markBusinessHoursComplete
  }
}
