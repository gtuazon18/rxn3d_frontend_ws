import { useState, useEffect } from 'react'
import { shadeApiService, PreferredTeethShadesResponse, PreferredTeethShadeBrand, PreferredTeethShade } from '@/services/shade-api-service'

interface UsePreferredTeethShadesProps {
  customerId: number
  enabled?: boolean
}

interface UsePreferredTeethShadesReturn {
  data: PreferredTeethShadesResponse | null
  brand: PreferredTeethShadeBrand | null
  shades: PreferredTeethShade[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateBrand: (brandId: number) => Promise<void>
}

export function usePreferredTeethShades({ 
  customerId, 
  enabled = true 
}: UsePreferredTeethShadesProps): UsePreferredTeethShadesReturn {
  const [data, setData] = useState<PreferredTeethShadesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferredTeethShades = async () => {
    console.log('usePreferredTeethShades: fetchPreferredTeethShades called', { enabled, customerId })
    
    if (!enabled || !customerId) {
      console.log('usePreferredTeethShades: Skipping fetch - not enabled or no customerId')
      return
    }

    console.log('usePreferredTeethShades: Starting API call')
    setLoading(true)
    setError(null)

    try {
      const response = await shadeApiService.getPreferredTeethShades({ customer_id: customerId })
      console.log('usePreferredTeethShades: API response', response)
      setData(response)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferred teeth shades'
      setError(errorMessage)
      console.error('Error fetching preferred teeth shades:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateBrand = async (brandId: number) => {
    if (!customerId) return

    try {
      await shadeApiService.updatePreferredTeethShadeBrand({
        customer_id: customerId,
        preferred_teeth_shade_brand_id: brandId
      })
      
      // Refetch data after updating brand
      await fetchPreferredTeethShades()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferred brand'
      setError(errorMessage)
      console.error('Error updating preferred brand:', err)
    }
  }

  useEffect(() => {
    console.log('usePreferredTeethShades: useEffect triggered', { customerId, enabled })
    fetchPreferredTeethShades()
  }, [customerId, enabled])

  return {
    data,
    brand: data?.data.preferred_brand || null,
    shades: data?.data.shades || [],
    loading,
    error,
    refetch: fetchPreferredTeethShades,
    updateBrand
  }
}
