import { treaty } from '@elysiajs/eden'
import { getApiUrl, getToken } from './config'

// Use dynamic import to avoid type errors
export function createClient() {
  const apiUrl = getApiUrl()
  const token = getToken()

  // Eden Treaty configuration
  const client = treaty(apiUrl, {
    headers: token ? {
      'Authorization': `Bearer ${token}`,
    } : undefined,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any
}

export function requireAuth(): string {
  const token = getToken()
  if (!token) {
    throw new Error('Not logged in. Please use "memohome auth login" to login first')
  }
  return token
}

export { getApiUrl, getToken }

