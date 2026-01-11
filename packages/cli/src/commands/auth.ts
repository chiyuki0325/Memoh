import type { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { createClient } from '../client'
import { setToken, clearToken, getToken, getApiUrl, setApiUrl } from '../config'
import { formatError } from '../utils'

export function authCommands(program: Command) {
  program
    .command('login')
    .description('Login to MemoHome')
    .option('-u, --username <username>', 'Username')
    .option('-p, --password <password>', 'Password')
    .action(async (options) => {
      try {
        let username = options.username
        let password = options.password

        if (!username || !password) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'username',
              message: 'Please enter username:',
              when: !username,
            },
            {
              type: 'password',
              name: 'password',
              message: 'Please enter password:',
              when: !password,
              mask: '*',
            },
          ])
          username = username || answers.username
          password = password || answers.password
        }

        const spinner = ora('Logging in...').start()
        const client = createClient()

        const response = await client.auth.login.post({
          username,
          password,
        })

        if (response.error) {
          spinner.fail(chalk.red('Login failed'))
          console.error(chalk.red(formatError(response.error.value)))
          process.exit(1)
        }

        const data = response.data as { success?: boolean; data?: { token?: string; user?: { username: string; role: string } } } | null
        if (data?.success && data?.data?.token && data?.data?.user) {
          setToken(data.data.token)
          spinner.succeed(chalk.green('Login successful!'))
          console.log(chalk.blue(`User: ${data.data.user.username}`))
          console.log(chalk.blue(`Role: ${data.data.user.role}`))
        } else {
          spinner.fail(chalk.red('Login failed'))
          console.error(chalk.red('Invalid response format'))
          process.exit(1)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('Login error:'), message)
        process.exit(1)
      }
    })

  program
    .command('logout')
    .description('Logout current user')
    .action(() => {
      const token = getToken()
      if (!token) {
        console.log(chalk.yellow('Not currently logged in'))
        return
      }

      clearToken()
      console.log(chalk.green('✓ Logged out'))
    })

  program
    .command('whoami')
    .description('View current logged in user')
    .action(async () => {
      try {
        const token = getToken()
        if (!token) {
          console.log(chalk.yellow('Not currently logged in'))
          console.log(chalk.dim('Use "memohome auth login" to login'))
          return
        }

        const spinner = ora('Fetching user information...').start()
        const client = createClient()

        const response = await client.auth.me.get()

        if (response.error) {
          spinner.fail(chalk.red('Failed to fetch user information'))
          console.error(chalk.red(formatError(response.error.value)))
          process.exit(1)
        }

        const data = response.data as { success?: boolean; data?: { username: string; role: string; id: string } } | null
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('Logged in'))
          console.log(chalk.blue(`Username: ${data.data.username}`))
          console.log(chalk.blue(`Role: ${data.data.role}`))
          console.log(chalk.blue(`User ID: ${data.data.id}`))
        } else {
          spinner.fail(chalk.red('Failed to fetch user information'))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('Error:'), message)
        process.exit(1)
      }
    })

  program
    .command('config')
    .description('View or set API configuration')
    .option('-s, --set <url>', 'Set API URL')
    .action((options) => {
      if (options.set) {
        const url = options.set
        setApiUrl(url)
        console.log(chalk.green(`✓ API URL set to: ${url}`))
      } else {
        const apiUrl = getApiUrl()
        const token = getToken()
        console.log(chalk.blue('Current configuration:'))
        console.log(chalk.dim(`API URL: ${apiUrl}`))
        console.log(chalk.dim(`Logged in: ${token ? 'Yes' : 'No'}`))
      }
    })
}

