import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { table } from 'table'
import { createClient, requireAuth } from '../client'

export function memoryCommands(program: Command) {
  program
    .command('search <query>')
    .description('搜索记忆')
    .option('-l, --limit <limit>', '返回结果数量', '10')
    .action(async (query, options) => {
      try {
        requireAuth()
        const spinner = ora('搜索记忆...').start()
        const client = createClient()

        const response = await client.memory.search.get({
          query: {
            q: query,
            limit: parseInt(options.limit),
          },
        })

        if (response.error) {
          spinner.fail(chalk.red('搜索失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green(`找到 ${data.data.length} 条记忆`))

          if (data.data.length === 0) {
            console.log(chalk.yellow('未找到相关记忆'))
            return
          }

          data.data.forEach((item: any, index: number) => {
            console.log()
            console.log(chalk.blue(`[${index + 1}] 相似度: ${(item.similarity * 100).toFixed(2)}%`))
            console.log(chalk.dim(`时间: ${new Date(item.timestamp).toLocaleString('zh-CN')}`))
            console.log(chalk.white(item.content))
          })
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('add <content>')
    .description('添加记忆')
    .action(async (content) => {
      try {
        requireAuth()
        const spinner = ora('添加记忆...').start()
        const client = createClient()

        const response = await client.memory.post({
          content,
        })

        if (response.error) {
          spinner.fail(chalk.red('添加记忆失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success) {
          spinner.succeed(chalk.green('记忆已添加'))
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('messages')
    .alias('msg')
    .description('获取消息历史')
    .option('-p, --page <page>', '页码', '1')
    .option('-l, --limit <limit>', '每页数量', '20')
    .action(async (options) => {
      try {
        requireAuth()
        const spinner = ora('获取消息历史...').start()
        const client = createClient()

        const response = await client.memory.message.get({
          query: {
            page: parseInt(options.page),
            limit: parseInt(options.limit),
          },
        })

        if (response.error) {
          spinner.fail(chalk.red('获取消息失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          const { messages, pagination } = data.data
          spinner.succeed(chalk.green(`消息历史 (${pagination.page}/${pagination.totalPages} 页)`))

          if (messages.length === 0) {
            console.log(chalk.yellow('暂无消息'))
            return
          }

          console.log(chalk.dim(`\n总计: ${pagination.total} 条消息\n`))

          messages.forEach((msg: any) => {
            const roleColor = msg.role === 'user' ? chalk.blue : chalk.green
            const roleIcon = msg.role === 'user' ? '👤' : '🤖'
            console.log(roleColor(`${roleIcon} ${msg.role.toUpperCase()}`))
            console.log(chalk.dim(new Date(msg.timestamp).toLocaleString('zh-CN')))
            console.log(chalk.white(msg.content))
            console.log()
          })
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('filter')
    .description('按日期范围过滤消息')
    .option('-s, --start <date>', '开始日期 (ISO 8601)')
    .option('-e, --end <date>', '结束日期 (ISO 8601)')
    .action(async (options) => {
      try {
        requireAuth()

        if (!options.start || !options.end) {
          console.error(chalk.red('请提供开始和结束日期'))
          console.log(chalk.dim('示例: memohome memory filter -s 2024-01-01T00:00:00Z -e 2024-12-31T23:59:59Z'))
          process.exit(1)
        }

        const spinner = ora('过滤消息...').start()
        const client = createClient()

        const response = await client.memory.message.filter.get({
          query: {
            startDate: options.start,
            endDate: options.end,
          },
        })

        if (response.error) {
          spinner.fail(chalk.red('过滤消息失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green(`找到 ${data.data.length} 条消息`))

          if (data.data.length === 0) {
            console.log(chalk.yellow('未找到消息'))
            return
          }

          console.log()

          data.data.forEach((msg: any) => {
            const roleColor = msg.role === 'user' ? chalk.blue : chalk.green
            const roleIcon = msg.role === 'user' ? '👤' : '🤖'
            console.log(roleColor(`${roleIcon} ${msg.role.toUpperCase()}`))
            console.log(chalk.dim(new Date(msg.timestamp).toLocaleString('zh-CN')))
            console.log(chalk.white(msg.content))
            console.log()
          })
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })
}

