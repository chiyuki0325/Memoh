import type { Command } from 'commander'
import chalk from 'chalk'
import { requireAuth, getApiUrl, getToken } from '../client'

export function agentCommands(program: Command) {
  program
    .command('chat <message>')
    .description('与 AI Agent 对话')
    .option('-t, --max-context-time <minutes>', '上下文加载时间（分钟）', '60')
    .option('-l, --language <language>', '回复语言', 'Chinese')
    .action(async (message, options) => {
      try {
        requireAuth()
        const token = getToken()!
        const apiUrl = getApiUrl()

        console.log(chalk.blue('🤖 Agent: '))

        const response = await fetch(`${apiUrl}/agent/stream`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            maxContextLoadTime: parseInt(options.maxContextTime),
            language: options.language,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json() as { error?: string }
          console.error(chalk.red('对话失败:'), errorData.error || '未知错误')
          process.exit(1)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('无法读取响应流')
        }

        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // 按行处理
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()

              if (data === '[DONE]') {
                console.log('\n')
                return
              }

              try {
                const event = JSON.parse(data)

                if (event.type === 'text-delta' && event.text) {
                  process.stdout.write(event.text)
                } else if (event.type === 'tool-call') {
                  console.log(chalk.dim(`\n[🔧 使用工具: ${event.toolName}]`))
                } else if (event.type === 'error') {
                  console.error(chalk.red('\n❌ 错误:'), event.error)
                }
              } catch {
                // 跳过无法解析的JSON
              }
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('错误:'), message)
        process.exit(1)
      }
    })

  program
    .command('interactive')
    .alias('i')
    .description('进入交互式对话模式')
    .option('-t, --max-context-time <minutes>', '上下文加载时间（分钟）', '60')
    .option('-l, --language <language>', '回复语言', 'Chinese')
    .action(async (options) => {
      try {
        requireAuth()
        const token = getToken()!
        const apiUrl = getApiUrl()

        console.log(chalk.green.bold('🤖 MemoHome Agent 交互模式'))
        console.log(chalk.dim('输入 /exit 或 /quit 退出，输入 /help 查看帮助\n'))

        const { createInterface } = await import('readline')
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: chalk.blue('You: '),
        })

        rl.prompt()

        rl.on('line', async (line: string) => {
          const input = line.trim()

          if (input === '/exit' || input === '/quit') {
            console.log(chalk.yellow('再见！👋'))
            rl.close()
            process.exit(0)
            return
          }

          if (input === '/help') {
            console.log(chalk.green('\n可用命令:'))
            console.log(chalk.dim('  /exit, /quit - 退出交互模式'))
            console.log(chalk.dim('  /help - 显示帮助信息\n'))
            rl.prompt()
            return
          }

          if (!input) {
            rl.prompt()
            return
          }

          try {
            console.log(chalk.green('Agent: '))

            const response = await fetch(`${apiUrl}/agent/stream`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: input,
                maxContextLoadTime: parseInt(options.maxContextTime),
                language: options.language,
              }),
            })

            if (!response.ok) {
              const errorData = await response.json() as { error?: string }
              console.error(chalk.red('对话失败:'), errorData.error || '未知错误')
              rl.prompt()
              return
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
              throw new Error('无法读取响应流')
            }

            let buffer = ''

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk

              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim()

                  if (data === '[DONE]') {
                    console.log('\n')
                    rl.prompt()
                    return
                  }

                  try {
                    const event = JSON.parse(data)

                    if (event.type === 'text-delta' && event.text) {
                      process.stdout.write(event.text)
                    } else if (event.type === 'tool-call') {
                      console.log(chalk.dim(`\n[🔧 ${event.toolName}]`))
                    } else if (event.type === 'error') {
                      console.error(chalk.red('\n❌'), event.error)
                    }
                  } catch {
                    // 跳过无法解析的JSON
                  }
                }
              }
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            console.error(chalk.red('错误:'), message)
            rl.prompt()
          }
        })

        rl.on('close', () => {
          console.log(chalk.yellow('\n再见！👋'))
          process.exit(0)
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('错误:'), message)
        process.exit(1)
      }
    })
}

