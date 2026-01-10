import type { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { createClient, requireAuth } from '../client'

export function settingsCommands(program: Command) {
  program
    .command('get')
    .description('获取当前用户设置')
    .action(async () => {
      try {
        requireAuth()
        const spinner = ora('获取设置...').start()
        const client = createClient()

        const response = await client.settings.get()

        if (response.error) {
          spinner.fail(chalk.red('获取设置失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          const settings = data.data
          spinner.succeed(chalk.green('当前设置'))
          console.log()
          console.log(chalk.blue('🎯 Agent 配置:'))
          console.log(chalk.dim(`  语言: ${settings.language || '未设置'}`))
          console.log(chalk.dim(`  上下文加载时间: ${settings.maxContextLoadTime || '未设置'} 分钟`))
          console.log()
          console.log(chalk.blue('🤖 默认模型:'))
          console.log(chalk.dim(`  聊天模型ID: ${settings.defaultChatModel || '未设置'}`))
          console.log(chalk.dim(`  摘要模型ID: ${settings.defaultSummaryModel || '未设置'}`))
          console.log(chalk.dim(`  嵌入模型ID: ${settings.defaultEmbeddingModel || '未设置'}`))
          console.log()
          console.log(chalk.blue('📊 其他:'))
          console.log(chalk.dim(`  用户ID: ${settings.userId}`))
          console.log(chalk.dim(`  创建时间: ${new Date(settings.createdAt).toLocaleString('zh-CN')}`))
          console.log(chalk.dim(`  更新时间: ${new Date(settings.updatedAt).toLocaleString('zh-CN')}`))
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('set')
    .description('更新用户设置')
    .option('--language <language>', '首选语言')
    .option('--max-context-time <minutes>', '上下文加载时间（分钟）')
    .option('--chat-model <id>', '默认聊天模型ID')
    .option('--summary-model <id>', '默认摘要模型ID')
    .option('--embedding-model <id>', '默认嵌入模型ID')
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
          console.log(chalk.yellow('未提供任何更新参数'))
          console.log(chalk.dim('\n可用选项:'))
          console.log(chalk.dim('  --language <language>'))
          console.log(chalk.dim('  --max-context-time <minutes>'))
          console.log(chalk.dim('  --chat-model <id>'))
          console.log(chalk.dim('  --summary-model <id>'))
          console.log(chalk.dim('  --embedding-model <id>'))
          return
        }

        const spinner = ora('更新设置...').start()
        const client = createClient()

        const response = await client.settings.put(updates)

        if (response.error) {
          spinner.fail(chalk.red('更新设置失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success) {
          spinner.succeed(chalk.green('设置已更新'))
          console.log()
          console.log(chalk.blue('更新的设置:'))
          Object.entries(updates).forEach(([key, value]) => {
            console.log(chalk.dim(`  ${key}: ${value}`))
          })
        }
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('setup')
    .description('交互式设置向导')
    .action(async () => {
      try {
        requireAuth()

        console.log(chalk.green.bold('\n🎨 设置向导\n'))

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'language',
            message: '首选语言:',
            default: 'Chinese',
          },
          {
            type: 'number',
            name: 'maxContextLoadTime',
            message: '上下文加载时间（分钟）:',
            default: 60,
            validate: (value) => {
              const num = parseInt(value)
              if (num < 1 || num > 1440) {
                return '请输入 1-1440 之间的数字'
              }
              return true
            },
          },
          {
            type: 'input',
            name: 'defaultChatModel',
            message: '默认聊天模型ID (留空跳过):',
          },
          {
            type: 'input',
            name: 'defaultSummaryModel',
            message: '默认摘要模型ID (留空跳过):',
          },
          {
            type: 'input',
            name: 'defaultEmbeddingModel',
            message: '默认嵌入模型ID (留空跳过):',
          },
        ])

        // 过滤掉空值
        const updates: any = {}
        Object.entries(answers).forEach(([key, value]) => {
          if (value) {
            updates[key] = value
          }
        })

        const spinner = ora('保存设置...').start()
        const client = createClient()

        const response = await client.settings.put(updates)

        if (response.error) {
          spinner.fail(chalk.red('保存设置失败'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('设置已保存'))
      } catch (error: any) {
        console.error(chalk.red('错误:'), error.message)
        process.exit(1)
      }
    })
}

