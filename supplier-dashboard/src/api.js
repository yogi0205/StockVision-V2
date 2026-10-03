const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { token, ...options } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError('Unable to reach StockVision. Check the API URL and try again.')
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const fallback = {
      401: 'Your session has expired. Please sign in again.',
      403: 'Your account is not allowed to perform this action.',
      404: 'The requested record could not be found.',
      409: 'This change conflicts with the current record state.',
    }
    throw new ApiError(result.message || fallback[response.status] || 'The request could not be completed.', response.status)
  }
  return result
}

export const api = {
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  me: (token) => request('/auth/me', { token }),
  products: (token) => request('/suppliers/products', { token }),
  createProduct: (token, product) => request('/suppliers/products', {
    token,
    method: 'POST',
    body: JSON.stringify(product),
  }),
  updateStock: (token, productId, stock) => request(`/suppliers/products/${productId}/stock`, {
    token,
    method: 'PATCH',
    body: JSON.stringify({ stock }),
  }),
  updateOrderStatus: (token, orderId, status) => request(`/orders/${orderId}/status`, {
    token,
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
}
