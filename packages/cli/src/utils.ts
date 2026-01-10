import chalk from 'chalk'

/**
 * 格式化 API 错误信息
 */
export function formatError(error: unknown): string {
  if (error === null || error === undefined) {
    return '未知错误'
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (typeof error === 'object') {
    // 尝试提取常见的错误字段
    const errorObj = error as Record<string, unknown>
    
    if ('message' in errorObj && typeof errorObj.message === 'string') {
      return errorObj.message
    }
    
    if ('error' in errorObj && typeof errorObj.error === 'string') {
      return errorObj.error
    }
    
    // 如果有 status 和 statusText
    if ('status' in errorObj && 'statusText' in errorObj) {
      return `${errorObj.status} ${errorObj.statusText}`
    }
    
    // 否则返回格式化的 JSON
    try {
      return JSON.stringify(error, null, 2)
    } catch {
      return String(error)
    }
  }
  
  return String(error)
}

/**
 * 打印错误并退出
 */
export function exitWithError(message: string, error?: unknown): never {
  console.error(chalk.red(message))
  if (error) {
    console.error(chalk.red(formatError(error)))
  }
  process.exit(1)
}

/**
 * 处理 Eden Treaty 响应错误
 */
export function handleApiError(response: { error?: { value: unknown } }, defaultMessage = '操作失败'): never {
  if (response.error) {
    exitWithError(defaultMessage, response.error.value)
  }
  exitWithError(defaultMessage, '未知错误')
}

