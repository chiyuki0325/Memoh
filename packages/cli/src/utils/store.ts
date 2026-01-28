import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type CliConfig = {
  host: string
  port: number
}

export type TokenInfo = {
  access_token: string
  token_type: string
  expires_at: string
  user_id: string
  username?: string
}

const defaultConfig: CliConfig = {
  host: '127.0.0.1',
  port: 8080,
}

const memohDir = () => join(homedir(), '.memoh')
const configPath = () => join(memohDir(), 'config.toml')
const tokenPath = () => join(memohDir(), 'token.json')

export const ensureStore = () => {
  const dir = memohDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

const parseTomlConfig = (raw: string): CliConfig => {
  const result: CliConfig = { ...defaultConfig }
  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^(\w+)\s*=\s*"?([^"]+)"?$/)
    if (!match) continue
    const key = match[1]
    const value = match[2]
    if (key === 'host') {
      result.host = value
    } else if (key === 'port') {
      const parsed = Number.parseInt(value, 10)
      if (!Number.isNaN(parsed)) result.port = parsed
    }
  }
  return result
}

const serializeTomlConfig = (config: CliConfig) => {
  return `host = "${config.host}"\nport = ${config.port}\n`
}

export const readConfig = (): CliConfig => {
  ensureStore()
  const path = configPath()
  if (!existsSync(path)) {
    writeFileSync(path, serializeTomlConfig(defaultConfig), 'utf-8')
    return { ...defaultConfig }
  }
  const raw = readFileSync(path, 'utf-8')
  return parseTomlConfig(raw)
}

export const writeConfig = (config: CliConfig) => {
  ensureStore()
  writeFileSync(configPath(), serializeTomlConfig(config), 'utf-8')
}

export const readToken = (): TokenInfo | null => {
  ensureStore()
  if (!existsSync(tokenPath())) return null
  try {
    const raw = readFileSync(tokenPath(), 'utf-8')
    return JSON.parse(raw) as TokenInfo
  } catch {
    return null
  }
}

export const writeToken = (token: TokenInfo) => {
  ensureStore()
  writeFileSync(tokenPath(), JSON.stringify(token, null, 2), 'utf-8')
}

export const clearToken = () => {
  ensureStore()
  writeFileSync(tokenPath(), '', 'utf-8')
}

export const getBaseURL = (config: CliConfig) => {
  return `http://${config.host}:${config.port}`
}

