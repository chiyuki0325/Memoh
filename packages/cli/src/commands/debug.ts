import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { getApiUrl, getToken } from '../client'

export function debugCommands(program: Command) {
  program
    .command('ping')
    .description('测试 API 服务器连接')
    .action(async () => {
      const apiUrl = getApiUrl()
      const token = getToken()
      
      console.log(chalk.blue('连接信息:'))
      console.log(chalk.dim(`  API URL: ${apiUrl}`))
      console.log(chalk.dim(`  Token: ${token ? '已设置' : '未设置'}`))
      console.log()

      const spinner = ora('正在连接...').start()
      
      try {
        // 尝试直接 fetch
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(`${apiUrl}/`, {
          signal: controller.signal,
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          spinner.succeed(chalk.green('连接成功!'))
          const text = await response.text()
          console.log(chalk.dim('响应:'), text.substring(0, 100))
        } else {
          spinner.fail(chalk.red(`连接失败: HTTP ${response.status}`))
        }
      } catch (error) {
        spinner.fail(chalk.red('连接失败'))
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error(chalk.yellow('连接超时 (5秒)'))
            console.error(chalk.dim('请检查 API 服务器是否正在运行'))
          } else {
            console.error(chalk.red('错误:'), error.message)
          }
        }
      }
    })
}

