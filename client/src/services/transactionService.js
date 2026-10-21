import { apiRequest } from './apiClient.js'

export async function getTransactions(params = {}) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }

  const suffix = query.toString() ? `?${query}` : ''
  const result = await apiRequest(`/transactions${suffix}`)

  return {
    transactions: Array.isArray(result.transactions)
      ? result.transactions
      : [],
    pagination: result.pagination ?? null,
  }
} 

export async function createTransaction(details) {
  const result = await apiRequest('/transactions', {
    method: 'POST',
    body: JSON.stringify(details),
  })

  return result.transaction
}

export async function reverseTransaction(id, reason) {
  const result = await apiRequest(`/transactions/${encodeURIComponent(id)}/reverse`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  })

  return result.transaction
}
