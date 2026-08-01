import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const DEFAULT_MODEL = 'deepseek-chat'
export const DEFAULT_OUTPUT_FILE = 'storage/game-content-agent/latest-draft.json'

const DEFAULT_CONTEXT_FILES = [
  'PRODUCT.md',
  'DESIGN.md',
  'philosophy.md',
  'docs/philosophy/characters-events.md',
  'docs/philosophy/buildings.md',
  'docs/philosophy/technology-policy.md',
  'docs/philosophy/ui.md',
  'src/events.ts',
  'src/economy.ts',
]

const ALLOWED_JOBS = new Set(['text', 'art'])
const JOB_ALIASES = {
  all: ['text', 'art'],
  texts: ['text'],
  copy: ['text'],
  prompts: ['art'],
  assets: ['art'],
  images: ['art'],
}

export function compact(value, max = 2000) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max)
}

export function normalizeJobs(value = 'all') {
  const source = Array.isArray(value) ? value : String(value || 'all').split(',')
  const jobs = source.flatMap(item => JOB_ALIASES[String(item).trim()] ?? [String(item).trim()])
    .map(item => item.toLowerCase())
    .filter(Boolean)
  const unique = [...new Set(jobs)]
  if (!unique.length || unique.some(job => !ALLOWED_JOBS.has(job))) {
    throw new Error(`--jobs 只能是 all、text、art 或逗号组合，当前值：${value}`)
  }
  return unique
}

export function parseJsonObject(content) {
  const raw = String(content || '').trim()
  const unwrapped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(unwrapped)
  } catch {
    const match = unwrapped.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('DeepSeek 没有返回 JSON 对象')
    try {
      return JSON.parse(match[0])
    } catch {
      throw new Error('DeepSeek 返回的 JSON 无法解析')
    }
  }
}

async function readProjectFile(rootDir, relativePath, maxChars) {
  const absolutePath = path.resolve(rootDir, relativePath)
  const content = await readFile(absolutePath, 'utf8')
  const clipped = content.length > maxChars ? `${content.slice(0, maxChars)}\n\n[TRUNCATED ${content.length - maxChars} chars]` : content
  return { relativePath, content: clipped }
}

export async function loadGameContext(options = {}) {
  const rootDir = options.rootDir || process.cwd()
  const files = options.files || DEFAULT_CONTEXT_FILES
  const maxCharsPerFile = Math.min(Math.max(Number(options.maxCharsPerFile || 18_000), 2000), 60_000)
  const sections = []
  const missing = []

  for (const relativePath of files) {
    try {
      sections.push(await readProjectFile(rootDir, relativePath, maxCharsPerFile))
    } catch (error) {
      if (error?.code === 'ENOENT') missing.push(relativePath)
      else throw error
    }
  }

  return { rootDir, sections, missing }
}

export async function loadPromptTemplate(rootDir = process.cwd()) {
  const promptPath = path.resolve(rootDir, 'config/game-content-agent-prompt.md')
  try {
    return await readFile(promptPath, 'utf8')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    return [
      '你是《月面王国》的内容与美术提示词 agent。',
      '请补充游戏元素的中文文字素材，并为可替换美术资源生成提示词。',
    ].join('\n')
  }
}

export function buildGameContentMessages({ context, promptTemplate, jobs, focus = 'all', count = 12 }) {
  const requestedJobs = normalizeJobs(jobs)
  const sourceBundle = context.sections.map(section => [
    `--- ${section.relativePath} ---`,
    section.content,
  ].join('\n')).join('\n\n')

  return [
    {
      role: 'system',
      content: [
        promptTemplate,
        '',
        '输出必须是单个 JSON object，不要 Markdown。',
        'JSON 顶层字段：summary, textMaterials, artPrompts, warnings。',
        'textMaterials 每项字段：targetType, targetId, field, currentText, proposedText, rationale, integrationHint。',
        'artPrompts 每项字段：assetId, targetType, targetId, usage, filename, aspectRatio, promptZh, promptEn, negativePrompt, styleNotes, integrationHint。',
        '不要改数值平衡，不要新建无法从现有规则追溯的资源、建筑、科技或角色。',
        '中文文案要克制、仪式化、略荒诞；美术提示词要能交给图像模型直接生产位图资产。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: {
          project: 'Lunar Crown / 月面王国',
          jobs: requestedJobs,
          focus,
          targetCount: Math.min(Math.max(Number(count) || 12, 1), 80),
          outputLanguage: 'zh-CN',
          missingContextFiles: context.missing,
        },
        sourceFiles: sourceBundle,
      }),
    },
  ]
}

function normalizeTextMaterials(value) {
  return (Array.isArray(value) ? value : []).map((item, index) => ({
    targetType: compact(item?.targetType, 40) || 'unknown',
    targetId: compact(item?.targetId, 120) || `text-${index + 1}`,
    field: compact(item?.field, 80) || 'copy',
    currentText: compact(item?.currentText, 1200),
    proposedText: compact(item?.proposedText, 2000),
    rationale: compact(item?.rationale, 800),
    integrationHint: compact(item?.integrationHint, 300),
  })).filter(item => item.proposedText)
}

function normalizeArtPrompts(value) {
  return (Array.isArray(value) ? value : []).map((item, index) => ({
    assetId: compact(item?.assetId, 120) || `asset-${index + 1}`,
    targetType: compact(item?.targetType, 40) || 'unknown',
    targetId: compact(item?.targetId, 120) || `asset-${index + 1}`,
    usage: compact(item?.usage, 120) || 'game asset',
    filename: compact(item?.filename, 180),
    aspectRatio: compact(item?.aspectRatio, 40) || '1:1',
    promptZh: compact(item?.promptZh, 2500),
    promptEn: compact(item?.promptEn, 2500),
    negativePrompt: compact(item?.negativePrompt, 1200),
    styleNotes: compact(item?.styleNotes, 1200),
    integrationHint: compact(item?.integrationHint, 300),
  })).filter(item => item.promptZh || item.promptEn)
}

export function normalizeDraft(raw, metadata = {}) {
  const draft = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return {
    version: 1,
    generatedAt: metadata.generatedAt || new Date().toISOString(),
    model: metadata.model || null,
    focus: metadata.focus || 'all',
    jobs: metadata.jobs || ['text', 'art'],
    summary: compact(draft.summary, 1200),
    textMaterials: normalizeTextMaterials(draft.textMaterials),
    artPrompts: normalizeArtPrompts(draft.artPrompts),
    warnings: (Array.isArray(draft.warnings) ? draft.warnings : []).map(item => compact(item, 500)).filter(Boolean),
  }
}

export async function requestGameContentFromDeepSeek({ env = process.env, messages, fetchImpl = fetch }) {
  const apiKey = compact(env.DEEPSEEK_API_KEY, 2000)
  if (!apiKey) throw new Error('缺少 DEEPSEEK_API_KEY，请在 .env 或环境变量中配置')
  const baseUrl = compact(env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com', 1000).replace(/\/$/, '')
  const model = compact(env.GAME_CONTENT_AGENT_MODEL || env.DEEPSEEK_MODEL || DEFAULT_MODEL, 200)

  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: Number(env.GAME_CONTENT_AGENT_TEMPERATURE || 0.65),
      response_format: { type: 'json_object' },
      messages,
    }),
  })

  let data = {}
  try {
    data = await response.json()
  } catch {
    // DeepSeek errors should usually be JSON, but keep the failure readable.
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `DeepSeek 请求失败（HTTP ${response.status}）`)
  }
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('DeepSeek 没有返回内容')
  return { raw: parseJsonObject(content), model }
}

export async function writeJsonAtomic(filePath, value) {
  const absolutePath = path.resolve(filePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  const temporary = `${absolutePath}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, absolutePath)
  return absolutePath
}

export function createGameContentAgent(options = {}) {
  const env = options.env || process.env
  const fetchImpl = options.fetchImpl || fetch
  const rootDir = options.rootDir || process.cwd()

  return {
    async buildPrompt({ jobs = 'all', focus = 'all', count = 12 } = {}) {
      const context = await loadGameContext({ rootDir })
      const promptTemplate = await loadPromptTemplate(rootDir)
      return buildGameContentMessages({ context, promptTemplate, jobs, focus, count })
    },

    async generate({ jobs = 'all', focus = 'all', count = 12, outputFile = DEFAULT_OUTPUT_FILE, write = true } = {}) {
      const normalizedJobs = normalizeJobs(jobs)
      const context = await loadGameContext({ rootDir })
      const promptTemplate = await loadPromptTemplate(rootDir)
      const messages = buildGameContentMessages({ context, promptTemplate, jobs: normalizedJobs, focus, count })
      const generated = await requestGameContentFromDeepSeek({ env, messages, fetchImpl })
      const draft = normalizeDraft(generated.raw, {
        model: generated.model,
        focus,
        jobs: normalizedJobs,
      })
      if (!write) return { mode: 'preview', draft }
      const savedTo = await writeJsonAtomic(path.resolve(rootDir, outputFile), draft)
      return { mode: 'written', savedTo, draft }
    },
  }
}
