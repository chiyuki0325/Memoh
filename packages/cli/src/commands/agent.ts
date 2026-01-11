import type { Command } from 'commander'
import chalk from 'chalk'
import { requireAuth, getApiUrl, getToken } from '../client'

export async function startInteractiveMode(options: { maxContextTime?: string; language?: string } = {}) {
  try {
    requireAuth()
    const token = getToken()!
    const apiUrl = getApiUrl()

    console.log(chalk.green.bold('🤖 MemoHome Agent Interactive Mode'))
    console.log(chalk.dim('Type /exit or /quit to exit, type /help for help\n'))

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
        console.log(chalk.yellow('Goodbye! 👋'))
        rl.close()
        process.exit(0)
        return
      }

      if (input === '/help') {
        console.log(chalk.green('\nAvailable commands:'))
        console.log(chalk.dim('  /exit, /quit - Exit interactive mode'))
        console.log(chalk.dim('  /help - Show help information\n'))
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
            maxContextLoadTime: parseInt(options.maxContextTime || '60'),
            language: options.language || 'Chinese',
          }),
        })

        if (!response.ok) {
          const errorData = await response.json() as { error?: string }
          console.error(chalk.red('Chat failed:'), errorData.error || 'Unknown error')
          rl.prompt()
          return
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('Unable to read response stream')
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
                // Skip unparseable JSON
              }
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('Error:'), message)
        rl.prompt()
      }
    })

    rl.on('close', () => {
      console.log(chalk.yellow('\nGoodbye! 👋'))
      process.exit(0)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(chalk.red('Error:'), message)
    process.exit(1)
  }
}

export function agentCommands(program: Command) {
  program
    .command('chat <message>')
    .description('Chat with AI Agent')
    .option('-t, --max-context-time <minutes>', 'Context load time (minutes)', '60')
    .option('-l, --language <language>', 'Response language', 'Chinese')
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
          console.error(chalk.red('Chat failed:'), errorData.error || 'Unknown error')
          process.exit(1)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('Unable to read response stream')
        }

        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // Process line by line
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
                  console.log(chalk.dim(`\n[🔧 Using tool: ${event.toolName}]`))
                } else if (event.type === 'error') {
                  console.error(chalk.red('\n❌ Error:'), event.error)
                }
              } catch {
                // Skip unparseable JSON
              }
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(chalk.red('Error:'), message)
        process.exit(1)
      }
    })

  program
    .command('interactive')
    .alias('i')
    .description('Enter interactive conversation mode')
    .option('-t, --max-context-time <minutes>', 'Context load time (minutes)', '60')
    .option('-l, --language <language>', 'Response language', 'Chinese')
    .action(async (options) => {
      await startInteractiveMode(options)
    })
}

