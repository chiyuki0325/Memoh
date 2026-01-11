import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { getApiUrl, getToken } from '../client'

export function debugCommands(program: Command) {
  program
    .command('ping')
    .description('Test API server connection')
    .action(async () => {
      const apiUrl = getApiUrl()
      const token = getToken()
      
      console.log(chalk.blue('Connection Info:'))
      console.log(chalk.dim(`  API URL: ${apiUrl}`))
      console.log(chalk.dim(`  Token: ${token ? 'Set' : 'Not set'}`))
      console.log()

      const spinner = ora('Connecting...').start()
      
      try {
        // Try direct fetch
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
          spinner.succeed(chalk.green('Connection successful!'))
          const text = await response.text()
          console.log(chalk.dim('Response:'), text.substring(0, 100))
        } else {
          spinner.fail(chalk.red(`Connection failed: HTTP ${response.status}`))
        }
      } catch (error) {
        spinner.fail(chalk.red('Connection failed'))
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error(chalk.yellow('Connection timeout (5 seconds)'))
            console.error(chalk.dim('Please check if the API server is running'))
          } else {
            console.error(chalk.red('Error:'), error.message)
          }
        }
      }
    })
}

