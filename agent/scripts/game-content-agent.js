#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createGameContentAgent, DEFAULT_OUTPUT_FILE } from '../src/gameContentAgent.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')

function loadEnvFile() {
  const envPath = path.resolve(rootDir, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator < 1) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] == null) process.env[key] = value
  }
}

function parseArgs(argv) {
  const args = { command: argv[0] || '' }
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--no-write') args.write = false
    else if (value === '--files') args.files = argv[++index]
    else if (value.startsWith('--')) args[value.slice(2)] = argv[++index]
  }
  return args
}

function usage() {
  return [
    '用法：',
    '  npm run content-agent -- generate [--jobs all|text|art] [--focus roles|events|facilities|technologies|ship|all] [--count 12] [--files src/events.ts,src/economy.ts] [--out storage/game-content-agent/latest-draft.json]',
    '  npm run content-agent -- prompt [--jobs all|text|art] [--focus all] [--count 12]',
    '',
    '环境变量：',
    '  DEEPSEEK_API_KEY=replace-with-key',
    '  DEEPSEEK_API_BASE_URL=https://api.deepseek.com',
    '  GAME_CONTENT_AGENT_MODEL=deepseek-chat',
    '',
    `默认输出：${DEFAULT_OUTPUT_FILE}`,
  ].join('\n')
}

async function main() {
  loadEnvFile()
  const args = parseArgs(process.argv.slice(2))
  const agent = createGameContentAgent({ rootDir })
  const jobs = args.jobs || 'all'
  const focus = args.focus || 'all'
  const count = Number(args.count || 12)
  const files = args.files ? String(args.files).split(',').map(item => item.trim()).filter(Boolean) : undefined

  if (args.command === 'prompt') {
    const messages = await agent.buildPrompt({ jobs, focus, count })
    console.log(JSON.stringify(messages, null, 2))
    return
  }

  if (args.command === 'generate') {
    const result = await agent.generate({
      jobs,
      focus,
      count,
      files,
      outputFile: args.out || DEFAULT_OUTPUT_FILE,
      write: args.write !== false,
    })
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.error(usage())
  process.exitCode = 1
}

main().catch(error => {
  console.error(`游戏素材 agent 执行失败：${error?.message || String(error)}`)
  process.exitCode = 1
})
