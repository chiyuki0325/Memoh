import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { table } from 'table'
import { createClient, requireAuth } from '../client'

export function memoryCommands(program: Command) {
  program
    .command('search <query>')
    .description('Search memories')
    .option('-l, --limit <limit>', 'Number of results to return', '10')
    .action(async (query, options) => {
      try {
        requireAuth()
        const spinner = ora('Searching memories...').start()
        const client = createClient()

        const response = await client.memory.search.get({
          query: {
            q: query,
            limit: parseInt(options.limit),
          },
        })

        if (response.error) {
          spinner.fail(chalk.red('Search failed'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green(`Found ${data.data.length} memories`))

          if (data.data.length === 0) {
            console.log(chalk.yellow('No related memories found'))
            return
          }

          data.data.forEach((item: any, index: number) => {
            console.log()
            console.log(chalk.blue(`[${index + 1}] Similarity: ${(item.similarity * 100).toFixed(2)}%`))
            console.log(chalk.dim(`Time: ${new Date(item.timestamp).toLocaleString('en-US')}`))
            console.log(chalk.white(item.content))
          })
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('add <content>')
    .description('Add memory')
    .action(async (content) => {
      try {
        requireAuth()
        const spinner = ora('Adding memory...').start()
        const client = createClient()

        const response = await client.memory.post({
          content,
        })

        if (response.error) {
          spinner.fail(chalk.red('Failed to add memory'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success) {
          spinner.succeed(chalk.green('Memory added'))
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('messages')
    .alias('msg')
    .description('Get message history')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-l, --limit <limit>', 'Items per page', '20')
    .action(async (options) => {
      try {
        requireAuth()
        const spinner = ora('Fetching message history...').start()
        const client = createClient()

        const response = await client.memory.message.get({
          query: {
            page: parseInt(options.page),
            limit: parseInt(options.limit),
          },
        })

        if (response.error) {
          spinner.fail(chalk.red('Failed to fetch messages'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          const { messages, pagination } = data.data
          spinner.succeed(chalk.green(`Message History (Page ${pagination.page}/${pagination.totalPages})`))

          if (messages.length === 0) {
            console.log(chalk.yellow('No messages'))
            return
          }

          console.log(chalk.dim(`\nTotal: ${pagination.total} messages\n`))

          messages.forEach((msg: any) => {
            const roleColor = msg.role === 'user' ? chalk.blue : chalk.green
            const roleIcon = msg.role === 'user' ? '👤' : '🤖'
            console.log(roleColor(`${roleIcon} ${msg.role.toUpperCase()}`))
            console.log(chalk.dim(new Date(msg.timestamp).toLocaleString('en-US')))
            console.log(chalk.white(msg.content))
            console.log()
          })
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('filter')
    .description('Filter messages by date range')
    .option('-s, --start <date>', 'Start date (ISO 8601)')
    .option('-e, --end <date>', 'End date (ISO 8601)')
    .action(async (options) => {
      try {
        requireAuth()

        if (!options.start || !options.end) {
          console.error(chalk.red('Please provide start and end dates'))
          console.log(chalk.dim('Example: memohome memory filter -s 2024-01-01T00:00:00Z -e 2024-12-31T23:59:59Z'))
          process.exit(1)
        }

        const spinner = ora('Filtering messages...').start()
        const client = createClient()

        const response = await client.memory.message.filter.get({
          query: {
            startDate: options.start,
            endDate: options.end,
          },
        })

        if (response.error) {
          spinner.fail(chalk.red('Failed to filter messages'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green(`Found ${data.data.length} messages`))

          if (data.data.length === 0) {
            console.log(chalk.yellow('No messages found'))
            return
          }

          console.log()

          data.data.forEach((msg: any) => {
            const roleColor = msg.role === 'user' ? chalk.blue : chalk.green
            const roleIcon = msg.role === 'user' ? '👤' : '🤖'
            console.log(roleColor(`${roleIcon} ${msg.role.toUpperCase()}`))
            console.log(chalk.dim(new Date(msg.timestamp).toLocaleString('en-US')))
            console.log(chalk.white(msg.content))
            console.log()
          })
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })
}

