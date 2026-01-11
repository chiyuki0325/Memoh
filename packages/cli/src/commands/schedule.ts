import type { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { table } from 'table'
import { createClient, requireAuth } from '../client'

export function scheduleCommands(program: Command) {
  program
    .command('list')
    .description('List all scheduled tasks')
    .action(async () => {
      try {
        requireAuth()
        const spinner = ora('Fetching scheduled tasks list...').start()
        const client = createClient()

        const response = await client.schedule.get()

        if (response.error) {
          spinner.fail(chalk.red('Failed to fetch scheduled tasks list'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('Scheduled Tasks List'))

          const schedules = data.data
          if (schedules.length === 0) {
            console.log(chalk.yellow('No scheduled tasks'))
            return
          }

          const tableData = [
            ['ID', 'Title', 'Cron', 'Enabled', 'Created At'],
            ...schedules.map((schedule: any) => [
              schedule.id.substring(0, 8) + '...',
              schedule.title,
              schedule.cronExpression,
              schedule.enabled ? chalk.green('Yes') : chalk.red('No'),
              new Date(schedule.createdAt).toLocaleString('en-US'),
            ]),
          ]

          console.log(table(tableData))
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('create')
    .description('Create scheduled task')
    .option('-t, --title <title>', 'Task title')
    .option('-d, --description <description>', 'Task description')
    .option('-c, --cron <expression>', 'Cron expression')
    .option('-e, --enabled', 'Enable task', false)
    .action(async (options) => {
      try {
        requireAuth()

        let { title, description, cron, enabled } = options

        if (!title || !cron) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'title',
              message: 'Task title:',
              when: !title,
            },
            {
              type: 'input',
              name: 'description',
              message: 'Task description (optional):',
              when: !description,
            },
            {
              type: 'input',
              name: 'cron',
              message: 'Cron expression (e.g., 0 9 * * *):',
              when: !cron,
            },
            {
              type: 'confirm',
              name: 'enabled',
              message: 'Enable task?',
              default: false,
              when: enabled === undefined,
            },
          ])

          title = title || answers.title
          description = description || answers.description
          cron = cron || answers.cron
          enabled = enabled !== undefined ? enabled : answers.enabled
        }

        const spinner = ora('Creating scheduled task...').start()
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
          spinner.fail(chalk.red('Failed to create scheduled task'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('Scheduled task created successfully'))
          console.log(chalk.blue(`Title: ${data.data.title}`))
          console.log(chalk.blue(`Cron: ${data.data.cronExpression}`))
          console.log(chalk.blue(`ID: ${data.data.id}`))
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('get <id>')
    .description('Get scheduled task details')
    .action(async (id) => {
      try {
        requireAuth()
        const spinner = ora('Fetching scheduled task details...').start()
        const client = createClient()

        const response = await client.schedule({ id }).get()

        if (response.error) {
          spinner.fail(chalk.red('Failed to fetch scheduled task'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          const schedule = data.data
          spinner.succeed(chalk.green('Scheduled Task Details'))
          console.log(chalk.blue(`ID: ${schedule.id}`))
          console.log(chalk.blue(`Title: ${schedule.title}`))
          if (schedule.description) {
            console.log(chalk.blue(`Description: ${schedule.description}`))
          }
          console.log(chalk.blue(`Cron: ${schedule.cronExpression}`))
          console.log(
            chalk.blue(`Enabled: ${schedule.enabled ? chalk.green('Yes') : chalk.red('No')}`)
          )
          console.log(
            chalk.blue(`Created At: ${new Date(schedule.createdAt).toLocaleString('en-US')}`)
          )
          console.log(
            chalk.blue(`Updated At: ${new Date(schedule.updatedAt).toLocaleString('en-US')}`)
          )
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('update <id>')
    .description('Update scheduled task')
    .option('-t, --title <title>', 'Task title')
    .option('-d, --description <description>', 'Task description')
    .option('-c, --cron <expression>', 'Cron expression')
    .option('-e, --enabled <boolean>', 'Enable task (true/false)')
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
          console.log(chalk.yellow('No update parameters provided'))
          return
        }

        const spinner = ora('Updating scheduled task...').start()
        const client = createClient()

        const response = await client.schedule({ id }).put(updates)

        if (response.error) {
          spinner.fail(chalk.red('Failed to update scheduled task'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('Scheduled task updated'))
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('delete <id>')
    .description('Delete scheduled task')
    .action(async (id) => {
      try {
        requireAuth()

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: chalk.yellow(`Are you sure you want to delete scheduled task ${id}?`),
            default: false,
          },
        ])

        if (!confirm) {
          console.log(chalk.yellow('Cancelled'))
          return
        }

        const spinner = ora('Deleting scheduled task...').start()
        const client = createClient()

        const response = await client.schedule({ id }).delete()

        if (response.error) {
          spinner.fail(chalk.red('Failed to delete scheduled task'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('Scheduled task deleted'))
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('toggle <id>')
    .description('Toggle scheduled task enabled status')
    .action(async (id) => {
      try {
        requireAuth()
        const spinner = ora('Toggling task status...').start()
        const client = createClient()

        // First get current status
        const getResponse = await client.schedule({ id }).get()

        if (getResponse.error) {
          spinner.fail(chalk.red('Failed to fetch task'))
          console.error(chalk.red(getResponse.error.value))
          process.exit(1)
        }

        const getData = getResponse.data as any
        if (getData?.success && getData?.data) {
          const currentEnabled = getData.data.enabled

          // Update status
          const updateResponse = await client.schedule({ id }).put({
            enabled: !currentEnabled,
          })

          if (updateResponse.error) {
            spinner.fail(chalk.red('Failed to update task'))
            console.error(chalk.red(updateResponse.error.value))
            process.exit(1)
          }

          spinner.succeed(
            chalk.green(`Task ${!currentEnabled ? 'enabled' : 'disabled'}`)
          )
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })
}

