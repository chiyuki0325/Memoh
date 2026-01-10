#!/usr/bin/env bun

import { Command } from 'commander'
import chalk from 'chalk'
import { authCommands } from './commands/auth'
import { userCommands } from './commands/user'
import { modelCommands } from './commands/model'
import { agentCommands } from './commands/agent'
import { memoryCommands } from './commands/memory'
import { settingsCommands } from './commands/settings'
import { scheduleCommands } from './commands/schedule'
import { debugCommands } from './commands/debug'

const program = new Command()

program
  .name('memohome')
  .description(chalk.bold.blue('🏠 MemoHome CLI - 智能记忆管理助手'))
  .version('1.0.0')

// 认证命令
const auth = program.command('auth').description('用户认证管理')
authCommands(auth)

// 用户管理命令
const user = program.command('user').description('用户管理 (需要管理员权限)')
userCommands(user)

// 模型管理命令
const model = program.command('model').description('AI 模型配置管理')
modelCommands(model)

// Agent 对话命令
const agent = program.command('agent').description('与 AI Agent 对话')
agentCommands(agent)

// 记忆管理命令
const memory = program.command('memory').description('记忆管理')
memoryCommands(memory)

// 设置管理命令
const settings = program.command('settings').description('用户设置管理')
settingsCommands(settings)

// 日程管理命令
const schedule = program.command('schedule').description('日程管理')
scheduleCommands(schedule)

// 调试命令
const debug = program.command('debug').description('调试工具')
debugCommands(debug)

program.parse()

