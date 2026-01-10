import type { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { table } from 'table'
import { createClient, requireAuth } from '../client'

export function scheduleCommands(program: Command) {
  program
    .command('list')
    .description('列出所有定时任务')
    .action(async () => {
      try {
        requireAuth()
        const spinner = ora('获取定时任务列表...').start()
        const client = createClient()

        const response = await client.schedule.get()

        if (response.error) {
          spinner.fail(chalk.red('获取定时任务列表失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('定时任务列表'))

          const schedules = data.data
          if (schedules.length === 0) {
            console.log(chalk.yellow('暂无定时任务'))
            return
          }

          const tableData = [
            ['ID', '标题', 'Cron', '启用', '创建时间'],
            ...schedules.map((schedule: any) => [
              schedule.id.substring(0, 8) + '...',
              schedule.title,
              schedule.cronExpression,
              schedule.enabled ? chalk.green('是') : chalk.red('否'),
              new Date(schedule.createdAt).toLocaleString('zh-CN'),
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
    .description('创建定时任务')
    .option('-t, --title <title>', '任务标题')
    .option('-d, --description <description>', '任务描述')
    .option('-c, --cron <expression>', 'Cron 表达式')
    .option('-e, --enabled', '启用任务', false)
    .action(async (options) => {
      try {
        requireAuth()

        let { title, description, cron, enabled } = options

        if (!title || !cron) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'title',
              message: '任务标题:',
              when: !title,
            },
            {
              type: 'input',
              name: 'description',
              message: '任务描述 (可选):',
              when: !description,
            },
            {
              type: 'input',
              name: 'cron',
              message: 'Cron 表达式 (如: 0 9 * * *):',
              when: !cron,
            },
            {
              type: 'confirm',
              name: 'enabled',
              message: '启用任务?',
              default: false,
              when: enabled === undefined,
            },
          ])

          title = title || answers.title
          description = description || answers.description
          cron = cron || answers.cron
          enabled = enabled !== undefined ? enabled : answers.enabled
        }

        const spinner = ora('创建定时任务...').start()
        const client = createClient()

        const payload: any = {
          title,
          cronExpression: cron,
          enabled,
        }

        if (description) {
          payload.description = description
        }

        const response = await client.schedule.post(payload)

        if (response.error) {
          spinner.fail(chalk.red('创建定时任务失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('定时任务创建成功'))
          console.log(chalk.blue(`标题: ${data.data.title}`))
          console.log(chalk.blue(`Cron: ${data.data.cronExpression}`))
          console.log(chalk.blue(`ID: ${data.data.id}`))
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('get <id>')
    .description('获取定时任务详情')
    .action(async (id) => {
      try {
        requireAuth()
        const spinner = ora('获取定时任务详情...').start()
        const client = createClient()

        const response = await client.schedule({ id }).get()

        if (response.error) {
          spinner.fail(chalk.red('获取定时任务失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          const schedule = data.data
          spinner.succeed(chalk.green('定时任务详情'))
          console.log(chalk.blue(`ID: ${schedule.id}`))
          console.log(chalk.blue(`标题: ${schedule.title}`))
          if (schedule.description) {
            console.log(chalk.blue(`描述: ${schedule.description}`))
          }
          console.log(chalk.blue(`Cron: ${schedule.cronExpression}`))
          console.log(
            chalk.blue(`启用: ${schedule.enabled ? chalk.green('是') : chalk.red('否')}`)
          )
          console.log(
            chalk.blue(`创建时间: ${new Date(schedule.createdAt).toLocaleString('zh-CN')}`)
          )
          console.log(
            chalk.blue(`更新时间: ${new Date(schedule.updatedAt).toLocaleString('zh-CN')}`)
          )
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('update <id>')
    .description('更新定时任务')
    .option('-t, --title <title>', '任务标题')
    .option('-d, --description <description>', '任务描述')
    .option('-c, --cron <expression>', 'Cron 表达式')
    .option('-e, --enabled <boolean>', '启用任务 (true/false)')
    .action(async (id, options) => {
      try {
        requireAuth()

        const updates: any = {}

        if (options.title) updates.title = options.title
        if (options.description) updates.description = options.description
        if (options.cron) updates.cronExpression = options.cron
        if (options.enabled !== undefined) {
          updates.enabled = options.enabled === 'true' || options.enabled === true
        }

        if (Object.keys(updates).length === 0) {
          console.log(chalk.yellow('未提供任何更新参数'))
          return
        }

        const spinner = ora('更新定时任务...').start()
        const client = createClient()

        const response = await client.schedule({ id }).put(updates)

        if (response.error) {
          spinner.fail(chalk.red('更新定时任务失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('定时任务已更新'))
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('delete <id>')
    .description('删除定时任务')
    .action(async (id) => {
      try {
        requireAuth()

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: chalk.yellow(`确定要删除定时任务 ${id} 吗?`),
            default: false,
          },
        ])

        if (!confirm) {
          console.log(chalk.yellow('已取消'))
          return
        }

        const spinner = ora('删除定时任务...').start()
        const client = createClient()

        const response = await client.schedule({ id }).delete()

        if (response.error) {
          spinner.fail(chalk.red('删除定时任务失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('定时任务已删除'))
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('toggle <id>')
    .description('切换定时任务启用状态')
    .action(async (id) => {
      try {
        requireAuth()
        const spinner = ora('切换任务状态...').start()
        const client = createClient()

        // 首先获取当前状态
        const getResponse = await client.schedule({ id }).get()

        if (getResponse.error) {
          spinner.fail(chalk.red('获取任务失败'))
          console.error(chalk.red(getResponse.error.value))
          process.exit(1)
        }

        const getData = getResponse.data as any
        if (getData?.success && getData?.data) {
          const currentEnabled = getData.data.enabled

          // 更新状态
          const updateResponse = await client.schedule({ id }).put({
            enabled: !currentEnabled,
          })

          if (updateResponse.error) {
            spinner.fail(chalk.red('更新任务失败'))
            console.error(chalk.red(updateResponse.error.value))
            process.exit(1)
          }

          spinner.succeed(
            chalk.green(`任务已${!currentEnabled ? '启用' : '禁用'}`)
          )
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })
}

