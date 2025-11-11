import { useState, useEffect } from 'react'
import { shadeApiService, PreferredGumShadesResponse, PreferredGumShadeBrand, PreferredGumShade } from '@/services/shade-api-service'

interface UsePreferredGumShadesProps {
  customerId: number
  enabled?: boolean
}

interface UsePreferredGumShadesReturn {
  data: PreferredGumShadesResponse | null
  brand: PreferredGumShadeBrand | null
  shades: PreferredGumShade[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateBrand: (brandId: number) => Promise<void>
}

export function usePreferredGumShades({ 
  customerId, 
  enabled = true 
}: UsePreferredGumShadesProps): UsePreferredGumShadesReturn {
  const [data, setData] = useState<PreferredGumShadesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferredGumShades = async () => {
    if (!enabled || !customerId) return

    setLoading(true)
    setError(null)

    try {
      const response = await shadeApiService.getPreferredGumShades({ customer_id: customerId })
      setData(response)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferred gum shades'
      setError(errorMessage)
      console.error('Error fetching preferred gum shades:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateBrand = async (brandId: number) => {
    if (!customerId) return

    try {
      await shadeApiService.updatePreferredGumShadeBrand({
        customer_id: customerId,
        preferred_gum_shade_brand_id: brandId
      })
      
      // Refetch data after updating brand
      await fetchPreferredGumShades()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferred brand'
      setError(errorMessage)
      console.error('Error updating preferred brand:', err)
    }
  }

  useEffect(() => {
    fetchPreferredGumShades()
  }, [customerId, enabled])

  return {
    data,
    brand: data?.data.preferred_brand || null,
    shades: data?.data.shades || [],
    loading,
    error,
    refetch: fetchPreferredGumShades,
    updateBrand
  }
}

