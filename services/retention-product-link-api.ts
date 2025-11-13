const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('token') || ''
}

// Helper function to get customer ID
const getCustomerId = () => {
  if (typeof window === 'undefined') return null

  const role = localStorage.getItem('role')
  const isLabAdmin = role === 'lab_admin'
  const isSuperAdmin = role === 'superadmin'
  const isOfficeAdmin = role === 'office_admin'
  const isDoctor = role === 'doctor'

  if (isOfficeAdmin || isDoctor) {
    const selectedLabId = localStorage.getItem('selectedLabId')
    if (selectedLabId) {
      return Number(selectedLabId)
    }
  } else if (isLabAdmin || isSuperAdmin) {
    const customerId = localStorage.getItem('customerId')
    if (customerId) {
      return parseInt(customerId, 10)
    }
  }

  return null
}

export interface LinkRetentionProductPayload {
  retention_id: number
  variation_id?: number
}

export interface LinkRetentionProductItemPayload {
  id: number
  retentions: LinkRetentionProductPayload[]
}

export interface LinkRetentionsProductsPayload {
  customer_id: number
  products: LinkRetentionProductItemPayload[]
}

export interface LinkRetentionsProductsResponse {
  success?: boolean
  status?: boolean
  message: string
  data?: any
}

/**
 * Link retentions to products
 * POST /library/retentions/link-products
 */
export const linkRetentionsToProducts = async (
  payload: LinkRetentionsProductsPayload
): Promise<LinkRetentionsProductsResponse> => {
  try {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token not found')
    }

    const response = await fetch(`${API_BASE_URL}/library/retentions/link-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (response.status === 401) {
      window.location.href = '/login'
      throw new Error('Unauthorized - Redirecting to login')
    }

    const json = await response.json()

    if (!response.ok) {
      throw new Error(json.message || `Failed to link retentions to products: ${response.status}`)
    }

    return {
      success: json.status || json.success || false,
      status: json.status || json.success || false,
      message: json.message,
      data: json.data
    }
  } catch (error: any) {
    console.error('Error linking retentions to products:', error)
    throw error
  }
}

/**
 * Build the payload for linking retentions to products
 */
export const buildRetentionLinkPayload = (
  selectedRetentionIds: number[],
  selectedProductIds: number[],
  products: any[],
  retentions: any[]
): LinkRetentionsProductsPayload => {
  const customerId = getCustomerId()

  if (!customerId) {
    throw new Error('Customer ID not found')
  }

  const productsPayload: LinkRetentionProductItemPayload[] = selectedProductIds.map((productId) => {
    const retentionsPayload: LinkRetentionProductPayload[] = selectedRetentionIds.map((retentionId) => {
      return {
        retention_id: retentionId,
        variation_id: retentionId, // Default to retention_id, adjust if you have variation data
      }
    })

    return {
      id: productId,
      retentions: retentionsPayload,
    }
  })

  return {
    customer_id: customerId,
    products: productsPayload,
  }
}

