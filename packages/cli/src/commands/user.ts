import type { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { table } from 'table'
import { createClient, requireAuth } from '../client'

export function userCommands(program: Command) {
  program
    .command('list')
    .description('列出所有用户 (需要管理员权限)')
    .action(async () => {
      try {
        requireAuth()
        const spinner = ora('获取用户列表...').start()
        const client = createClient()

        const response = await client.user.get()

        if (response.error) {
          spinner.fail(chalk.red('获取用户列表失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('用户列表'))

          const users = data.data
          if (users.length === 0) {
            console.log(chalk.yellow('暂无用户'))
            return
          }

          const tableData = [
            ['ID', '用户名', '角色', '创建时间'],
            ...users.map((user: any) => [
              user.id,
              user.username,
              user.role === 'admin' ? chalk.red('管理员') : chalk.blue('用户'),
              new Date(user.createdAt).toLocaleString('zh-CN'),
            ]),
          ]

          console.log(table(tableData))
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('create')
    .description('创建新用户 (需要管理员权限)')
    .option('-u, --username <username>', '用户名')
    .option('-p, --password <password>', '密码')
    .option('-r, --role <role>', '角色 (user/admin)', 'user')
    .action(async (options) => {
      try {
        requireAuth()

        let username = options.username
        let password = options.password
        let role = options.role

        if (!username || !password) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'username',
              message: '用户名:',
              when: !username,
            },
            {
              type: 'password',
              name: 'password',
              message: '密码:',
              when: !password,
              mask: '*',
            },
            {
              type: 'list',
              name: 'role',
              message: '角色:',
              choices: ['user', 'admin'],
              default: 'user',
              when: !role,
            },
          ])
          username = username || answers.username
          password = password || answers.password
          role = role || answers.role
        }

        const spinner = ora('创建用户...').start()
        const client = createClient()

        const response = await client.user.post({
          username,
          password,
          role,
        })

        if (response.error) {
          spinner.fail(chalk.red('创建用户失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('用户创建成功'))
          console.log(chalk.blue(`用户名: ${data.data.username}`))
          console.log(chalk.blue(`角色: ${data.data.role}`))
          console.log(chalk.blue(`ID: ${data.data.id}`))
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('delete <id>')
    .description('删除用户 (需要管理员权限)')
    .action(async (id) => {
      try {
        requireAuth()

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: chalk.yellow(`确定要删除用户 ${id} 吗?`),
            default: false,
          },
        ])

        if (!confirm) {
          console.log(chalk.yellow('已取消'))
          return
        }

        const spinner = ora('删除用户...').start()
        const client = createClient()

        const response = await client.user({ id }).delete()

        if (response.error) {
          spinner.fail(chalk.red('删除用户失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('用户已删除'))
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('get <id>')
    .description('获取用户详情')
    .action(async (id) => {
      try {
        requireAuth()
        const spinner = ora('获取用户信息...').start()
        const client = createClient()

        const response = await client.user({ id }).get()

        if (response.error) {
          spinner.fail(chalk.red('获取用户信息失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          const user = data.data
          spinner.succeed(chalk.green('用户信息'))
          console.log(chalk.blue(`ID: ${user.id}`))
          console.log(chalk.blue(`用户名: ${user.username}`))
          console.log(chalk.blue(`角色: ${user.role}`))
          console.log(chalk.blue(`创建时间: ${new Date(user.createdAt).toLocaleString('zh-CN')}`))
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('update-password <id>')
    .description('更新用户密码 (需要管理员权限)')
    .option('-p, --password <password>', '新密码')
    .action(async (id, options) => {
      try {
        requireAuth()

        let password = options.password

        if (!password) {
          const answers = await inquirer.prompt([
            {
              type: 'password',
              name: 'password',
              message: '新密码:',
              mask: '*',
            },
          ])
          password = answers.password
        }

        const spinner = ora('更新密码...').start()
        const client = createClient()

        const response = await client.user({ id }).password.patch({
          password,
        })

        if (response.error) {
          spinner.fail(chalk.red('更新密码失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('密码已更新'))
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })
}

