import type { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { createClient, requireAuth } from '../client'

export function configCommands(program: Command) {
  program
    .command('get')
    .description('Get current user settings')
    .action(async () => {
      try {
        requireAuth()
        const spinner = ora('Fetching settings...').start()
        const client = createClient()

        const response = await client.settings.get()

        if (response.error) {
          spinner.fail(chalk.red('Failed to fetch settings'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          const settings = data.data
          spinner.succeed(chalk.green('Current Settings'))
          console.log()
          console.log(chalk.blue('🎯 Agent Configuration:'))
          console.log(chalk.dim(`  Language: ${settings.language || 'Not set'}`))
          console.log(chalk.dim(`  Context Load Time: ${settings.maxContextLoadTime || 'Not set'} minutes`))
          console.log()
          console.log(chalk.blue('🤖 Default Models:'))
          console.log(chalk.dim(`  Chat Model ID: ${settings.defaultChatModel || 'Not set'}`))
          console.log(chalk.dim(`  Summary Model ID: ${settings.defaultSummaryModel || 'Not set'}`))
          console.log(chalk.dim(`  Embedding Model ID: ${settings.defaultEmbeddingModel || 'Not set'}`))
          console.log()
          console.log(chalk.blue('📊 Other:'))
          console.log(chalk.dim(`  User ID: ${settings.userId}`))
          console.log(chalk.dim(`  Created At: ${new Date(settings.createdAt).toLocaleString('en-US')}`))
          console.log(chalk.dim(`  Updated At: ${new Date(settings.updatedAt).toLocaleString('en-US')}`))
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('set')
    .description('Update user settings')
    .option('--language <language>', 'Preferred language')
    .option('--max-context-time <minutes>', 'Context load time (minutes)')
    .option('--chat-model <id>', 'Default chat model ID')
    .option('--summary-model <id>', 'Default summary model ID')
    .option('--embedding-model <id>', 'Default embedding model ID')
    .action(async (options) => {
      try {
        requireAuth()

        const updates: any = {}

        if (options.language) updates.language = options.language
        if (options.maxContextTime)
          updates.maxContextLoadTime = parseInt(options.maxContextTime)
        if (options.chatModel) updates.defaultChatModel = options.chatModel
        if (options.summaryModel) updates.defaultSummaryModel = options.summaryModel
        if (options.embeddingModel)
          updates.defaultEmbeddingModel = options.embeddingModel

        if (Object.keys(updates).length === 0) {
          console.log(chalk.yellow('No update parameters provided'))
          console.log(chalk.dim('\nAvailable options:'))
          console.log(chalk.dim('  --language <language>'))
          console.log(chalk.dim('  --max-context-time <minutes>'))
          console.log(chalk.dim('  --chat-model <id>'))
          console.log(chalk.dim('  --summary-model <id>'))
          console.log(chalk.dim('  --embedding-model <id>'))
          return
        }

        const spinner = ora('Updating settings...').start()
        const client = createClient()

        const response = await client.settings.put(updates)

        if (response.error) {
          spinner.fail(chalk.red('Failed to update settings'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success) {
          spinner.succeed(chalk.green('Settings updated'))
          console.log()
          console.log(chalk.blue('Updated settings:'))
          Object.entries(updates).forEach(([key, value]) => {
            console.log(chalk.dim(`  ${key}: ${value}`))
          })
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('setup')
    .description('Interactive settings wizard')
    .action(async () => {
      try {
        requireAuth()

        console.log(chalk.green.bold('\n🎨 Settings Wizard\n'))

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'language',
            message: 'Preferred language:',
            default: 'Chinese',
          },
          {
            type: 'number',
            name: 'maxContextLoadTime',
            message: 'Context load time (minutes):',
            default: 60,
            validate: (value) => {
              const num = parseInt(value)
              if (num < 1 || num > 1440) {
                return 'Please enter a number between 1-1440'
              }
              return true
            },
          },
          {
            type: 'input',
            name: 'defaultChatModel',
            message: 'Default chat model ID (leave empty to skip):',
          },
          {
            type: 'input',
            name: 'defaultSummaryModel',
            message: 'Default summary model ID (leave empty to skip):',
          },
          {
            type: 'input',
            name: 'defaultEmbeddingModel',
            message: 'Default embedding model ID (leave empty to skip):',
          },
        ])

        // Filter out empty values
        const updates: any = {}
        Object.entries(answers).forEach(([key, value]) => {
          if (value) {
            updates[key] = value
          }
        })

        const spinner = ora('Saving settings...').start()
        const client = createClient()

        const response = await client.settings.put(updates)

        if (response.error) {
          spinner.fail(chalk.red('Failed to save settings'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('Settings saved'))
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })
}

