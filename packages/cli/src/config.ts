import { homedir } from 'os'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

const CONFIG_DIR = join(homedir(), '.memohome')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export interface Config {
  apiUrl: string
  token?: string
}

const DEFAULT_CONFIG: Config = {
  apiUrl: process.env.API_BASE_URL || 'http://localhost:7002',
}

export function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export function loadConfig(): Config {
  ensureConfigDir()
  
  if (!existsSync(CONFIG_FILE)) {
    saveConfig(DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  }

  try {
    const data = readFileSync(CONFIG_FILE, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
  } catch {
    console.error('Failed to load config, using defaults')
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: Config) {
  ensureConfigDir()
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function getToken(): string | null {
  const config = loadConfig()
  return config.token || null
}

export function setToken(token: string) {
  const config = loadConfig()
  config.token = token
  saveConfig(config)
}

export function clearToken() {
  const config = loadConfig()
  delete config.token
  saveConfig(config)
}

export function getApiUrl(): string {
  const config = loadConfig()
  return config.apiUrl
}

export function setApiUrl(url: string) {
  const config = loadConfig()
  config.apiUrl = url
  saveConfig(config)
}

