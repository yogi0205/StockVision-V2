const API_URL = (import.meta.env.VITE_API_URL || '')
  .replace(/\/+$/, '')

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
    throw new ApiError(result.message || 'The request could not be completed.', response.status)
  }
  return result
}

export const api = {
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  me: (token) => request('/auth/me', { token }),
  suppliers: (token) => request('/shops/suppliers', { token }),
  supplierProducts: (token, supplierId) => request(`/shops/suppliers/${supplierId}/products`, { token }),
  orders: (token) => request('/orders', { token }),
  order: (token, orderId) => request(`/orders/${orderId}`, { token }),
  createOrder: (token, order) => request('/orders', {
    token,
    method: 'POST',
    body: JSON.stringify(order),
  }),
}

export function getInventorySocketUrl() {
  const configuredUrl = import.meta.env.VITE_WS_URL
  if (configuredUrl) return configuredUrl

  const url = new URL(API_URL || window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws/inventory'
  return url.toString()
}
