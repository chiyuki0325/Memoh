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
    .description('列出所有模型配置')
    .action(async () => {
      const spinner = ora('获取模型列表...').start()
      try {
        requireAuth()
        const client = createClient()
        
        const response = await client.model.get()

        if (response.error) {
          spinner.fail(chalk.red('获取模型列表失败'))
          console.error(chalk.red(formatError(response.error.value)))
          process.exit(1)
        }

        // API 返回格式: { success, items, pagination }
        const data = response.data as { success?: boolean; items?: Model[]; pagination?: unknown } | null
        if (data?.success && data?.items) {
          spinner.succeed(chalk.green('模型列表'))

          const models = data.items
          if (models.length === 0) {
            console.log(chalk.yellow('暂无模型配置'))
            return
          }

          const tableData = [
            ['ID', '名称', '模型ID', '类型', '客户端'],
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
        spinner.fail(chalk.red('操作失败'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('连接超时，请检查：'))
            console.error(chalk.yellow('  1. API 服务器是否正在运行'))
            console.error(chalk.yellow('  2. API 地址是否正确'))
            console.error(chalk.dim(`     当前配置: ${getUrl()}`))
          } else {
            console.error(chalk.red('错误:'), error.message)
          }
        } else {
          console.error(chalk.red('错误:'), String(error))
        }
        process.exit(1)
      }
    })

  program
    .command('create')
    .description('创建模型配置')
    .option('-n, --name <name>', '模型名称')
    .option('-m, --model-id <modelId>', '模型ID')
    .option('-u, --base-url <baseUrl>', 'API Base URL')
    .option('-k, --api-key <apiKey>', 'API Key')
    .option('-c, --client-type <clientType>', '客户端类型 (openai/anthropic/google)')
    .option('-t, --type <type>', '模型类型 (chat/embedding)', 'chat')
    .option('-d, --dimensions <dimensions>', 'Embedding 维度 (仅 embedding 类型需要)')
    .action(async (options) => {
      const spinner = ora('创建模型配置...').start()
      try {
        requireAuth()

        let { name, modelId, baseUrl, apiKey, clientType, type, dimensions } = options

        if (!name || !modelId || !baseUrl || !apiKey || !clientType) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: '模型名称:',
              when: !name,
            },
            {
              type: 'input',
              name: 'modelId',
              message: '模型ID (如 gpt-4 或 text-embedding-3-small):',
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
              message: '客户端类型:',
              choices: ['openai', 'anthropic', 'google'],
              default: 'openai',
              when: !clientType,
            },
            {
              type: 'list',
              name: 'type',
              message: '模型类型:',
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

        // 如果是 embedding 类型，需要 dimensions
        if (type === 'embedding' && !dimensions) {
          const answer = await inquirer.prompt([
            {
              type: 'number',
              name: 'dimensions',
              message: 'Embedding 维度 (如 1536):',
              validate: (value: number) => {
                if (value > 0) return true
                return '维度必须是正整数'
              },
            },
          ])
          dimensions = answer.dimensions
        }

        spinner.text = '创建模型配置...'
        const client = createClient()

        const payload: Record<string, unknown> = {
          name,
          modelId,
          baseUrl,
          apiKey,
          clientType,
          type,
        }

        // 如果是 embedding 类型，添加 dimensions
        if (type === 'embedding') {
          if (!dimensions) {
            console.error(chalk.red('Embedding 模型需要指定 dimensions'))
            process.exit(1)
          }
          payload.dimensions = typeof dimensions === 'number' ? dimensions : parseInt(dimensions)
        }

        const response = await client.model.post(payload)

        if (response.error) {
          spinner.fail(chalk.red('创建模型配置失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as ApiResponse<Model> | null
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('模型配置创建成功'))
          console.log(chalk.blue(`名称: ${data.data.name}`))
          console.log(chalk.blue(`模型ID: ${data.data.modelId}`))
          console.log(chalk.blue(`类型: ${data.data.type || 'chat'}`))
          if (data.data.type === 'embedding' && data.data.dimensions) {
            console.log(chalk.blue(`维度: ${data.data.dimensions}`))
          }
          console.log(chalk.blue(`ID: ${data.data.id}`))
        }
      } catch (error) {
        spinner.fail(chalk.red('操作失败'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('连接超时，请检查：'))
            console.error(chalk.yellow('  1. API 服务器是否正在运行'))
            console.error(chalk.yellow('  2. API 地址是否正确'))
            console.error(chalk.dim(`     当前配置: ${getUrl()}`))
          } else {
            console.error(chalk.red('错误:'), error.message)
          }
        } else {
          console.error(chalk.red('错误:'), String(error))
        }
        process.exit(1)
      }
    })

  program
    .command('delete <id>')
    .description('删除模型配置')
    .action(async (id) => {
      let spinner: ReturnType<typeof ora> | undefined
      try {
        requireAuth()

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: chalk.yellow(`确定要删除模型配置 ${id} 吗?`),
            default: false,
          },
        ])

        if (!confirm) {
          console.log(chalk.yellow('已取消'))
          return
        }

        spinner = ora('删除模型配置...').start()
        const client = createClient()

        const response = await client.model({ id }).delete()

        if (response.error) {
          spinner.fail(chalk.red('删除模型配置失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        if (spinner) spinner.succeed(chalk.green('模型配置已删除'))
      } catch (error) {
        if (spinner) spinner.fail(chalk.red('操作失败'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('连接超时，请检查：'))
            console.error(chalk.yellow('  1. API 服务器是否正在运行'))
            console.error(chalk.yellow('  2. API 地址是否正确'))
            console.error(chalk.dim(`     当前配置: ${getUrl()}`))
          } else {
            console.error(chalk.red('错误:'), error.message)
          }
        } else {
          console.error(chalk.red('错误:'), String(error))
        }
        process.exit(1)
      }
    })

  program
    .command('get <id>')
    .description('获取模型配置详情')
    .action(async (id) => {
      const spinner = ora('获取模型配置...').start()
      try {
        requireAuth()
        const client = createClient()

        const response = await client.model({ id }).get()

        if (response.error) {
          spinner.fail(chalk.red('获取模型配置失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as ApiResponse<Model> | null
        if (data?.success && data?.data) {
          const model = data.data
          spinner.succeed(chalk.green('模型配置'))
          console.log(chalk.blue(`ID: ${model.id}`))
          console.log(chalk.blue(`名称: ${model.name}`))
          console.log(chalk.blue(`模型ID: ${model.modelId}`))
          console.log(chalk.blue(`类型: ${model.type || 'chat'}`))
          if (model.type === 'embedding' && model.dimensions) {
            console.log(chalk.blue(`维度: ${model.dimensions}`))
          }
          console.log(chalk.blue(`Base URL: ${model.baseUrl}`))
          console.log(chalk.blue(`客户端类型: ${model.clientType}`))
          console.log(chalk.blue(`创建时间: ${new Date(model.createdAt).toLocaleString('zh-CN')}`))
        }
      } catch (error) {
        spinner.fail(chalk.red('操作失败'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('连接超时，请检查：'))
            console.error(chalk.yellow('  1. API 服务器是否正在运行'))
            console.error(chalk.yellow('  2. API 地址是否正确'))
            console.error(chalk.dim(`     当前配置: ${getUrl()}`))
          } else {
            console.error(chalk.red('错误:'), error.message)
          }
        } else {
          console.error(chalk.red('错误:'), String(error))
        }
        process.exit(1)
      }
    })

  program
    .command('defaults')
    .description('查看默认模型配置')
    .action(async () => {
      const spinner = ora('获取默认模型配置...').start()
      try {
        requireAuth()
        const client = createClient()

        const [chatRes, summaryRes, embeddingRes] = await Promise.all([
          client.model.chat.default.get(),
          client.model.summary.default.get(),
          client.model.embedding.default.get(),
        ])

        spinner.stop()

        console.log(chalk.green.bold('默认模型配置:'))
        console.log()

        // Chat Model
        const chatData = chatRes.data as ApiResponse<Model> | null
        if (chatData?.success && chatData.data) {
          const model = chatData.data
          console.log(chalk.blue('💬 聊天模型:'))
          console.log(chalk.dim(`  名称: ${model.name}`))
          console.log(chalk.dim(`  模型ID: ${model.modelId}`))
          console.log(chalk.dim(`  ID: ${model.id}`))
        } else {
          console.log(chalk.yellow('💬 聊天模型: 未配置'))
        }
        console.log()

        // Summary Model
        const summaryData = summaryRes.data as ApiResponse<Model> | null
        if (summaryData?.success && summaryData.data) {
          const model = summaryData.data
          console.log(chalk.blue('📝 摘要模型:'))
          console.log(chalk.dim(`  名称: ${model.name}`))
          console.log(chalk.dim(`  模型ID: ${model.modelId}`))
          console.log(chalk.dim(`  ID: ${model.id}`))
        } else {
          console.log(chalk.yellow('📝 摘要模型: 未配置'))
        }
        console.log()

        // Embedding Model
        const embeddingData = embeddingRes.data as ApiResponse<Model> | null
        if (embeddingData?.success && embeddingData.data) {
          const model = embeddingData.data
          console.log(chalk.blue('🔍 嵌入模型:'))
          console.log(chalk.dim(`  名称: ${model.name}`))
          console.log(chalk.dim(`  模型ID: ${model.modelId}`))
          console.log(chalk.dim(`  ID: ${model.id}`))
        } else {
          console.log(chalk.yellow('🔍 嵌入模型: 未配置'))
        }
      } catch (error) {
        spinner.fail(chalk.red('操作失败'))
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            const { getApiUrl: getUrl } = await import('../config')
            console.error(chalk.red('连接超时，请检查：'))
            console.error(chalk.yellow('  1. API 服务器是否正在运行'))
            console.error(chalk.yellow('  2. API 地址是否正确'))
            console.error(chalk.dim(`     当前配置: ${getUrl()}`))
          } else {
            console.error(chalk.red('错误:'), error.message)
          }
        } else {
          console.error(chalk.red('错误:'), String(error))
        }
        process.exit(1)
      }
    })
}

