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
    .description('登录到 MemoHome')
    .option('-u, --username <username>', '用户名')
    .option('-p, --password <password>', '密码')
    .action(async (options) => {
      try {
        let username = options.username
        let password = options.password

        if (!username || !password) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'username',
              message: '请输入用户名:',
              when: !username,
            },
            {
              type: 'password',
              name: 'password',
              message: '请输入密码:',
              when: !password,
              mask: '*',
            },
          ])
          username = username || answers.username
          password = password || answers.password
        }

        const spinner = ora('正在登录...').start()
        const client = createClient()

        const response = await client.auth.login.post({
          username,
          password,
        })

        if (response.error) {
          spinner.fail(chalk.red('登录失败'))
          console.error(chalk.red(formatError(response.error.value)))
          process.exit(1)
        }

        const data = response.data as { success?: boolean; data?: { token?: string; user?: { username: string; role: string } } } | null
        if (data?.success && data?.data?.token && data?.data?.user) {
          setToken(data.data.token)
          spinner.succeed(chalk.green('登录成功!'))
          console.log(chalk.blue(`用户: ${data.data.user.username}`))
          console.log(chalk.blue(`角色: ${data.data.user.role}`))
        } else {
          spinner.fail(chalk.red('登录失败'))
          console.error(chalk.red('无效的响应格式'))
          process.exit(1)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('登录错误:'), message)
        process.exit(1)
      }
    })

  program
    .command('logout')
    .description('登出当前用户')
    .action(() => {
      const token = getToken()
      if (!token) {
        console.log(chalk.yellow('当前未登录'))
        return
      }

      clearToken()
      console.log(chalk.green('✓ 已登出'))
    })

  program
    .command('whoami')
    .description('查看当前登录用户')
    .action(async () => {
      try {
        const token = getToken()
        if (!token) {
          console.log(chalk.yellow('当前未登录'))
          console.log(chalk.dim('使用 "memohome auth login" 登录'))
          return
        }

        const spinner = ora('获取用户信息...').start()
        const client = createClient()

        const response = await client.auth.me.get()

        if (response.error) {
          spinner.fail(chalk.red('获取用户信息失败'))
          console.error(chalk.red(formatError(response.error.value)))
          process.exit(1)
        }

        const data = response.data as { success?: boolean; data?: { username: string; role: string; id: string } } | null
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('已登录'))
          console.log(chalk.blue(`用户名: ${data.data.username}`))
          console.log(chalk.blue(`角色: ${data.data.role}`))
          console.log(chalk.blue(`用户ID: ${data.data.id}`))
        } else {
          spinner.fail(chalk.red('获取用户信息失败'))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('错误:'), message)
        process.exit(1)
      }
    })

  program
    .command('config')
    .description('查看或设置 API 配置')
    .option('-s, --set <url>', '设置 API URL')
    .action((options) => {
      if (options.set) {
        const url = options.set
        setApiUrl(url)
        console.log(chalk.green(`✓ API URL 已设置为: ${url}`))
      } else {
        const apiUrl = getApiUrl()
        const token = getToken()
        console.log(chalk.blue('当前配置:'))
        console.log(chalk.dim(`API URL: ${apiUrl}`))
        console.log(chalk.dim(`已登录: ${token ? '是' : '否'}`))
      }
    })
}

