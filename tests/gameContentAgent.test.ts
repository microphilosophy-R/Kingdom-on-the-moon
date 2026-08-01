import { describe, expect, it } from 'vitest'
import {
  buildGameContentMessages,
  createGameContentAgent,
  normalizeDraft,
  normalizeJobs,
  parseJsonObject,
  requestGameContentFromDeepSeek,
} from '../agent/src/gameContentAgent.js'

describe('game content agent', () => {
  it('normalizes job aliases', () => {
    expect(normalizeJobs('all')).toEqual(['text', 'art'])
    expect(normalizeJobs('texts,assets')).toEqual(['text', 'art'])
    expect(() => normalizeJobs('balance')).toThrow('--jobs')
  })

  it('parses fenced JSON responses', () => {
    expect(parseJsonObject('```json\n{"summary":"ok"}\n```')).toEqual({ summary: 'ok' })
    expect(parseJsonObject('prefix {"summary":"ok"} suffix')).toEqual({ summary: 'ok' })
  })

  it('builds source-grounded DeepSeek messages', () => {
    const messages = buildGameContentMessages({
      context: {
        sections: [{ relativePath: 'src/events.ts', content: 'export const roles = []' }],
        missing: [],
      },
      promptTemplate: 'system prompt',
      jobs: 'art',
      focus: 'roles',
      count: 3,
    })

    expect(messages).toHaveLength(2)
    expect(messages[0].content).toContain('system prompt')
    expect(messages[1].content).toContain('src/events.ts')
    expect(messages[1].content).toContain('"jobs":["art"]')
  })

  it('normalizes generated drafts', () => {
    const draft = normalizeDraft({
      summary: 'ok',
      textMaterials: [{ targetId: 'sava', proposedText: '新的台词' }],
      artPrompts: [{ assetId: 'role-sava', promptZh: '月尘中的异客肖像' }],
      warnings: ['needs review'],
    }, { model: 'mock-model', focus: 'roles', jobs: ['text', 'art'], generatedAt: '2026-08-01T00:00:00.000Z' })

    expect(draft).toMatchObject({
      version: 1,
      model: 'mock-model',
      focus: 'roles',
      jobs: ['text', 'art'],
      summary: 'ok',
    })
    expect(draft.textMaterials[0].targetId).toBe('sava')
    expect(draft.artPrompts[0].assetId).toBe('role-sava')
    expect(draft.warnings).toEqual(['needs review'])
  })

  it('requests and parses DeepSeek JSON with a mocked fetch', async () => {
    const fetchImpl = async (url: string, init: RequestInit) => {
      expect(String(url)).toBe('https://api.deepseek.com/chat/completions')
      expect(init.method).toBe('POST')
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"summary":"generated","textMaterials":[],"artPrompts":[],"warnings":[]}' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const result = await requestGameContentFromDeepSeek({
      env: { DEEPSEEK_API_KEY: 'test-key', GAME_CONTENT_AGENT_MODEL: 'mock-model' },
      messages: [{ role: 'user', content: 'hello' }],
      fetchImpl,
    })

    expect(result.model).toBe('mock-model')
    expect(result.raw.summary).toBe('generated')
  })

  it('can run the agent in preview mode with mocked context and fetch', async () => {
    const fetchImpl = async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'preview',
            textMaterials: [{ targetType: 'role', targetId: 'sava', proposedText: '请将晶体放在王座背光里。' }],
            artPrompts: [{ assetId: 'role-sava', targetType: 'role', targetId: 'sava', promptZh: '暖灰月尘背景中的折光甲壳异客肖像' }],
            warnings: [],
          }),
        },
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })

    const agent = createGameContentAgent({
      rootDir: process.cwd(),
      env: { DEEPSEEK_API_KEY: 'test-key', GAME_CONTENT_AGENT_MODEL: 'mock-model' },
      fetchImpl,
    })
    const result = await agent.generate({ jobs: 'all', focus: 'roles', count: 2, write: false })

    expect(result.mode).toBe('preview')
    expect(result.draft.summary).toBe('preview')
    expect(result.draft.textMaterials).toHaveLength(1)
    expect(result.draft.artPrompts).toHaveLength(1)
  })
})
