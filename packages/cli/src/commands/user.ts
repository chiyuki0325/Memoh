import type { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { table } from 'table'
import { createClient, requireAuth } from '../client'

export function userCommands(program: Command) {
  program
    .command('list')
    .description('List all users (requires admin privileges)')
    .action(async () => {
      try {
        requireAuth()
        const spinner = ora('Fetching user list...').start()
        const client = createClient()

        const response = await client.user.get()

        if (response.error) {
          spinner.fail(chalk.red('Failed to fetch user list'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('User List'))

          const users = data.data
          if (users.length === 0) {
            console.log(chalk.yellow('No users'))
            return
          }

          const tableData = [
            ['ID', 'Username', 'Role', 'Created At'],
            ...users.map((user: any) => [
              user.id,
              user.username,
              user.role === 'admin' ? chalk.red('Admin') : chalk.blue('User'),
              new Date(user.createdAt).toLocaleString('en-US'),
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
    .description('Create new user (requires admin privileges)')
    .option('-u, --username <username>', 'Username')
    .option('-p, --password <password>', 'Password')
    .option('-r, --role <role>', 'Role (user/admin)', 'user')
    .action(async (options) => {
      try {
        requireAuth()

        let username = options.username
        let password = options.password
        let role = options.role

        if (!username || !password) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'username',
              message: 'Username:',
              when: !username,
            },
            {
              type: 'password',
              name: 'password',
              message: 'Password:',
              when: !password,
              mask: '*',
            },
            {
              type: 'list',
              name: 'role',
              message: 'Role:',
              choices: ['user', 'admin'],
              default: 'user',
              when: !role,
            },
          ])
          username = username || answers.username
          password = password || answers.password
          role = role || answers.role
        }

        const spinner = ora('Creating user...').start()
        const client = createClient()

        const response = await client.user.post({
          username,
          password,
          role,
        })

        if (response.error) {
          spinner.fail(chalk.red('Failed to create user'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          spinner.succeed(chalk.green('User created successfully'))
          console.log(chalk.blue(`Username: ${data.data.username}`))
          console.log(chalk.blue(`Role: ${data.data.role}`))
          console.log(chalk.blue(`ID: ${data.data.id}`))
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('delete <id>')
    .description('Delete user (requires admin privileges)')
    .action(async (id) => {
      try {
        requireAuth()

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: chalk.yellow(`Are you sure you want to delete user ${id}?`),
            default: false,
          },
        ])

        if (!confirm) {
          console.log(chalk.yellow('Cancelled'))
          return
        }

        const spinner = ora('Deleting user...').start()
        const client = createClient()

        const response = await client.user({ id }).delete()

        if (response.error) {
          spinner.fail(chalk.red('Failed to delete user'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('User deleted'))
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('get <id>')
    .description('Get user details')
    .action(async (id) => {
      try {
        requireAuth()
        const spinner = ora('Fetching user information...').start()
        const client = createClient()

        const response = await client.user({ id }).get()

        if (response.error) {
          spinner.fail(chalk.red('Failed to fetch user information'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        const data = response.data as any
        if (data?.success && data?.data) {
          const user = data.data
          spinner.succeed(chalk.green('User Information'))
          console.log(chalk.blue(`ID: ${user.id}`))
          console.log(chalk.blue(`Username: ${user.username}`))
          console.log(chalk.blue(`Role: ${user.role}`))
          console.log(chalk.blue(`Created At: ${new Date(user.createdAt).toLocaleString('en-US')}`))
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })

  program
    .command('update-password <id>')
    .description('Update user password (requires admin privileges)')
    .option('-p, --password <password>', 'New password')
    .action(async (id, options) => {
      try {
        requireAuth()

        let password = options.password

        if (!password) {
          const answers = await inquirer.prompt([
            {
              type: 'password',
              name: 'password',
              message: 'New password:',
              mask: '*',
            },
          ])
          password = answers.password
        }

        const spinner = ora('Updating password...').start()
        const client = createClient()

        const response = await client.user({ id }).password.patch({
          password,
        })

        if (response.error) {
          spinner.fail(chalk.red('Failed to update password'))
          console.error(chalk.red(response.error.value))
          process.exit(1)
        }

        spinner.succeed(chalk.green('Password updated'))
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message)
        process.exit(1)
      }
    })
}

