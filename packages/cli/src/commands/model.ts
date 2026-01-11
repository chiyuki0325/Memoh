import type { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { table } from 'table'
import { createClient, requireAuth } from '../client'
import type { ApiResponse, Model } from '../types'
import { formatError } from '../utils'

export function modelCommands(program: Command) {
  program
    .command('list')
    .description('List all model configurations')
    .action(async () => {
      const spinner = ora('Fetching model list...').start()
      try {
        requireAuth()
        const client = createClient()
        
        const response = await client.model.get()

        if (response.error) {
          spinner.fail(chalk.red('Failed to fetch model list'))
          console.error(chalk.red(formatError(response.error.value)))
          process.exit(1)
        }

        // API response format: { success, items, pagination }
        const data = response.data as { success?: boolean; items?: Model[]; pagination?: unknown } | null
        if (data?.success && data?.items) {
          spinner.succeed(chalk.green('Model List'))

          const models = data.items
          if (models.length === 0) {
            console.log(chalk.yellow('No model configurations found'))
            return
          }

          const tableData = [
            ['ID', 'Name', 'Model ID', 'Type', 'Client'],
            ...models.map((item: unknown) => {
              const modelItem = item as { id: string; model: Model }
              return [
                modelItem.id.substring(0, 8) + '...',
                modelItem.model.name || '-',
                modelItem.model.modelId,
                modelItem.model.type === 'embedding' ? chalk.yellow('embedding') : chalk.blue('chat'),
                modelItem.model.clientType,
              ]
            }),
          ]

          console.log(table(tableData))
        }
      } catch (error) {
        spinner.fail(chalk.red('Operation failed'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('Connection timeout, please check:'))
            console.error(chalk.yellow('  1. Is the API server running?'))
            console.error(chalk.yellow('  2. Is the API URL correct?'))
            console.error(chalk.dim(`     Current config: ${getUrl()}`))
          } else {
            console.error(chalk.red('Error:'), error.message)
          }
        } else {
          console.error(chalk.red('Error:'), String(error))
        }
        process.exit(1)
      }
    })

  program
    .command('create')
    .description('Create model configuration')
    .option('-n, --name <name>', 'Model name')
    .option('-m, --model-id <modelId>', 'Model ID')
    .option('-u, --base-url <baseUrl>', 'API Base URL')
    .option('-k, --api-key <apiKey>', 'API Key')
    .option('-c, --client-type <clientType>', 'Client type (openai/anthropic/google)')
    .option('-t, --type <type>', 'Model type (chat/embedding)', 'chat')
    .option('-d, --dimensions <dimensions>', 'Embedding dimensions (required for embedding type)')
    .action(async (options) => {
      const spinner = ora('Creating model configuration...').start()
      try {
        requireAuth()

        let { name, modelId, baseUrl, apiKey, clientType, type, dimensions } = options

        if (!name || !modelId || !baseUrl || !apiKey || !clientType) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Model name:',
              when: !name,
            },
            {
              type: 'input',
              name: 'modelId',
              message: 'Model ID (e.g., gpt-4 or text-embedding-3-small):',
              when: !modelId,
            },
            {
              type: 'input',
              name: 'baseUrl',
              message: 'API Base URL:',
              default: 'https://api.openai.com/v1',
              when: !baseUrl,
            },
            {
              type: 'password',
              name: 'apiKey',
              message: 'API Key:',
              when: !apiKey,
              mask: '*',
            },
            {
              type: 'list',
              name: 'clientType',
              message: 'Client type:',
              choices: ['openai', 'anthropic', 'google'],
              default: 'openai',
              when: !clientType,
            },
            {
              type: 'list',
              name: 'type',
              message: 'Model type:',
              choices: ['chat', 'embedding'],
              default: 'chat',
              when: !type,
            },
          ])

          name = name || answers.name
          modelId = modelId || answers.modelId
          baseUrl = baseUrl || answers.baseUrl
          apiKey = apiKey || answers.apiKey
          clientType = clientType || answers.clientType
          type = type || answers.type
        }

        // If embedding type, dimensions is required
        if (type === 'embedding' && !dimensions) {
          const answer = await inquirer.prompt([
            {
              type: 'number',
              name: 'dimensions',
              message: 'Embedding dimensions (e.g., 1536):',
              validate: (value: number) => {
                if (value > 0) return true
                return 'Dimensions must be a positive integer'
              },
            },
          ])
          dimensions = answer.dimensions
        }

        spinner.text = 'Creating model configuration...'
        const client = createClient()

        const payload: Record<string, unknown> = {
          name,
          modelId,
          baseUrl,
          apiKey,
          clientType,
          type,
        }

        // If embedding type, add dimensions
        if (type === 'embedding') {
          if (!dimensions) {
            console.error(chalk.red('Embedding models require dimensions to be specified'))
            process.exit(1)
          }
          payload.dimensions = typeof dimensions === 'number' ? dimensions : parseInt(dimensions)
        }

        const response = await client.model.post(payload)

        if (response.error) {
          spinner.fail(chalk.red('Failed to create model configuration'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as ApiResponse<Model> | null
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('Model configuration created successfully'))
          console.log(chalk.blue(`Name: ${data.data.name}`))
          console.log(chalk.blue(`Model ID: ${data.data.modelId}`))
          console.log(chalk.blue(`Type: ${data.data.type || 'chat'}`))
          if (data.data.type === 'embedding' && data.data.dimensions) {
            console.log(chalk.blue(`Dimensions: ${data.data.dimensions}`))
          }
          console.log(chalk.blue(`ID: ${data.data.id}`))
        }
      } catch (error) {
        spinner.fail(chalk.red('Operation failed'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('Connection timeout, please check:'))
            console.error(chalk.yellow('  1. Is the API server running?'))
            console.error(chalk.yellow('  2. Is the API URL correct?'))
            console.error(chalk.dim(`     Current config: ${getUrl()}`))
          } else {
            console.error(chalk.red('Error:'), error.message)
          }
        } else {
          console.error(chalk.red('Error:'), String(error))
        }
        process.exit(1)
      }
    })

  program
    .command('delete <id>')
    .description('Delete model configuration')
    .action(async (id) => {
      let spinner: ReturnType<typeof ora> | undefined
      try {
        requireAuth()

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: chalk.yellow(`Are you sure you want to delete model configuration ${id}?`),
            default: false,
          },
        ])

        if (!confirm) {
          console.log(chalk.yellow('Cancelled'))
          return
        }

        spinner = ora('Deleting model configuration...').start()
        const client = createClient()

        const response = await client.model({ id }).delete()

        if (response.error) {
          spinner.fail(chalk.red('Failed to delete model configuration'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        if (spinner) spinner.succeed(chalk.green('Model configuration deleted'))
      } catch (error) {
        if (spinner) spinner.fail(chalk.red('Operation failed'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('Connection timeout, please check:'))
            console.error(chalk.yellow('  1. Is the API server running?'))
            console.error(chalk.yellow('  2. Is the API URL correct?'))
            console.error(chalk.dim(`     Current config: ${getUrl()}`))
          } else {
            console.error(chalk.red('Error:'), error.message)
          }
        } else {
          console.error(chalk.red('Error:'), String(error))
        }
        process.exit(1)
      }
    })

  program
    .command('get <id>')
    .description('Get model configuration details')
    .action(async (id) => {
      const spinner = ora('Fetching model configuration...').start()
      try {
        requireAuth()
        const client = createClient()

        const response = await client.model({ id }).get()

        if (response.error) {
          spinner.fail(chalk.red('Failed to fetch model configuration'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as ApiResponse<Model> | null
        if (data?.success && data?.data) {
          const model = data.data
          spinner.succeed(chalk.green('Model Configuration'))
          console.log(chalk.blue(`ID: ${model.id}`))
          console.log(chalk.blue(`Name: ${model.name}`))
          console.log(chalk.blue(`Model ID: ${model.modelId}`))
          console.log(chalk.blue(`Type: ${model.type || 'chat'}`))
          if (model.type === 'embedding' && model.dimensions) {
            console.log(chalk.blue(`Dimensions: ${model.dimensions}`))
          }
          console.log(chalk.blue(`Base URL: ${model.baseUrl}`))
          console.log(chalk.blue(`Client Type: ${model.clientType}`))
          console.log(chalk.blue(`Created At: ${new Date(model.createdAt).toLocaleString('en-US')}`))
        }
      } catch (error) {
        spinner.fail(chalk.red('Operation failed'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('Connection timeout, please check:'))
            console.error(chalk.yellow('  1. Is the API server running?'))
            console.error(chalk.yellow('  2. Is the API URL correct?'))
            console.error(chalk.dim(`     Current config: ${getUrl()}`))
          } else {
            console.error(chalk.red('Error:'), error.message)
          }
        } else {
          console.error(chalk.red('Error:'), String(error))
        }
        process.exit(1)
      }
    })

  program
    .command('defaults')
    .description('View default model configurations')
    .action(async () => {
      const spinner = ora('Fetching default model configurations...').start()
      try {
        requireAuth()
        const client = createClient()

        const [chatRes, summaryRes, embeddingRes] = await Promise.all([
          client.model.chat.default.get(),
          client.model.summary.default.get(),
          client.model.embedding.default.get(),
        ])

        spinner.stop()

        console.log(chalk.green.bold('Default Model Configurations:'))
        console.log()

        // Chat Model
        const chatData = chatRes.data as ApiResponse<Model> | null
        if (chatData?.success && chatData.data) {
          const model = chatData.data
          console.log(chalk.blue('💬 Chat Model:'))
          console.log(chalk.dim(`  Name: ${model.name}`))
          console.log(chalk.dim(`  Model ID: ${model.modelId}`))
          console.log(chalk.dim(`  ID: ${model.id}`))
        } else {
          console.log(chalk.yellow('💬 Chat Model: Not configured'))
        }
        console.log()

        // Summary Model
        const summaryData = summaryRes.data as ApiResponse<Model> | null
        if (summaryData?.success && summaryData.data) {
          const model = summaryData.data
          console.log(chalk.blue('📝 Summary Model:'))
          console.log(chalk.dim(`  Name: ${model.name}`))
          console.log(chalk.dim(`  Model ID: ${model.modelId}`))
          console.log(chalk.dim(`  ID: ${model.id}`))
        } else {
          console.log(chalk.yellow('📝 Summary Model: Not configured'))
        }
        console.log()

        // Embedding Model
        const embeddingData = embeddingRes.data as ApiResponse<Model> | null
        if (embeddingData?.success && embeddingData.data) {
          const model = embeddingData.data
          console.log(chalk.blue('🔍 Embedding Model:'))
          console.log(chalk.dim(`  Name: ${model.name}`))
          console.log(chalk.dim(`  Model ID: ${model.modelId}`))
          console.log(chalk.dim(`  ID: ${model.id}`))
        } else {
          console.log(chalk.yellow('🔍 Embedding Model: Not configured'))
        }
      } catch (error) {
        spinner.fail(chalk.red('Operation failed'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('Connection timeout, please check:'))
            console.error(chalk.yellow('  1. Is the API server running?'))
            console.error(chalk.yellow('  2. Is the API URL correct?'))
            console.error(chalk.dim(`     Current config: ${getUrl()}`))
          } else {
            console.error(chalk.red('Error:'), error.message)
          }
        } else {
          console.error(chalk.red('Error:'), String(error))
        }
        process.exit(1)
      }
    })
}

