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

export interface StageGradePayload {
  grade_id: number
  price: number
}

export interface ProductStagePayload {
  stage_id: number
  variation_id: number
  grades: StageGradePayload[]
}

export interface LinkProductPayload {
  id: number
  stages: ProductStagePayload[]
}

export interface LinkStagesProductsPayload {
  customer_id: number
  products: LinkProductPayload[]
}

export interface LinkStagesProductsResponse {
  success?: boolean
  status?: boolean  // API returns 'status' instead of 'success'
  message: string
  data?: any
}

/**
 * Link stages to products
 * POST /library/stages/link-products
 */
export const linkStagesToProducts = async (
  payload: LinkStagesProductsPayload
): Promise<LinkStagesProductsResponse> => {
  try {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token not found')
    }

    const response = await fetch(`${API_BASE_URL}/library/stages/link-products`, {
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
      throw new Error(json.message || `Failed to link stages to products: ${response.status}`)
    }

    // Normalize response - API returns 'status' but we use 'success'
    return {
      success: json.status || json.success || false,
      status: json.status || json.success || false,
      message: json.message,
      data: json.data
    }
  } catch (error: any) {
    console.error('Error linking stages to products:', error)
    throw error
  }
}

/**
 * Build the payload for linking stages to products
 * This helper function constructs the payload based on selected stages and products
 */
export const buildLinkPayload = (
  selectedStageIds: number[],
  selectedProductIds: number[],
  products: any[], // Array of products with their stages
  stages: any[] // Array of stages with their details
): LinkStagesProductsPayload => {
  const customerId = getCustomerId()

  if (!customerId) {
    throw new Error('Customer ID not found')
  }

  // Build products array
  const productsPayload: LinkProductPayload[] = selectedProductIds.map((productId) => {
    const product = products.find((p) => p.id === productId)

    // Build stages array for this product
    const stagesPayload: ProductStagePayload[] = selectedStageIds.map((stageId) => {
      const stage = stages.find((s) => s.id === stageId)

      // Get variation_id (default to the stage_id if no variations available)
      // You may need to adjust this logic based on your actual data structure
      const variationId = stageId // Default to stage_id, adjust if you have variation data

      // Build grades array
      // If the product already has grade pricing for this stage, use it
      // Otherwise, use default grade pricing from the stage
      let gradesPayload: StageGradePayload[] = []

      if (product && product.stages) {
        const existingStage = product.stages.find((s: any) => s.id === stageId)
        if (existingStage && existingStage.grade_pricing) {
          // Use existing grade pricing from product
          gradesPayload = existingStage.grade_pricing.map((gp: any) => ({
            grade_id: gp.grade_id,
            price: parseFloat(gp.price) || 0,
          }))
        }
      }

      // If no existing grades, try to get from the stage or use product grades
      if (gradesPayload.length === 0) {
        if (product && product.grades) {
          // Use product's grade structure
          gradesPayload = product.grades.map((grade: any) => ({
            grade_id: grade.id,
            price: parseFloat(stage?.price || grade.price || '0'),
          }))
        } else if (stage && stage.price !== undefined) {
          // Use stage price as default for all grades (assuming 4 standard grades)
          // You may need to fetch actual grades from the API
          gradesPayload = [
            { grade_id: 1, price: parseFloat(stage.price as any) || 0 },
            { grade_id: 2, price: parseFloat(stage.price as any) || 0 },
            { grade_id: 3, price: parseFloat(stage.price as any) || 0 },
            { grade_id: 4, price: parseFloat(stage.price as any) || 0 },
          ]
        }
      }

      return {
        stage_id: stageId,
        variation_id: variationId,
        grades: gradesPayload,
      }
    })

    return {
      id: productId,
      stages: stagesPayload,
    }
  })

  return {
    customer_id: customerId,
    products: productsPayload,
  }
}
