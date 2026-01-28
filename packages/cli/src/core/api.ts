import { readConfig, readToken, getBaseURL, TokenInfo } from '../utils/store'

export type ApiError = {
  status: number
  message: string
}

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: TokenInfo | null
): Promise<T> => {
  const config = readConfig()
  const baseURL = getBaseURL(config)
  const token = tokenOverride ?? readToken()

  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (token?.access_token) {
    headers.set('Authorization', `Bearer ${token.access_token}`)
  }

  const resp = await fetch(`${baseURL}${path}`, {
    ...options,
    headers,
  })
  if (!resp.ok) {
    let message = resp.statusText
    try {
      const data = await resp.json()
      if (data?.message) message = data.message
    } catch {
      // ignore
    }
    const err: ApiError = { status: resp.status, message }
    throw err
  }
  if (resp.status === 204) {
    return null as T
  }
  return (await resp.json()) as T
}

