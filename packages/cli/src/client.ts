import { treaty } from '@elysiajs/eden'
import { getApiUrl, getToken } from './config'

// 使用动态导入来避免类型错误
export function createClient() {
  const apiUrl = getApiUrl()
  const token = getToken()

  // Eden Treaty 配置
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
    throw new Error('未登录，请先使用 "memohome auth login" 命令登录')
  }
  return token
}

export { getApiUrl, getToken }

