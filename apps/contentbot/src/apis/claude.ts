import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type { ContentBotConfig, CoupangProduct } from '../types/index.js'

interface GeneratedContent {
  title: string
  content: string
  metaDescription: string
  tokenCost: number
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const isValidUrl = (url: string): boolean => {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

const buildProductSection = (products: CoupangProduct[]): string => {
  if (products.length === 0) return ''

  const items = products
    .filter((p) => isValidUrl(p.productUrl))
    .map(
      (p) =>
        `<li><a href="${escapeHtml(p.productUrl)}" target="_blank" rel="noopener">${escapeHtml(p.productName)}</a> — ${p.productPrice.toLocaleString()}원</li>`,
    )
    .join('\n')

  if (items.length === 0) return ''

  return `\n\n<h2>추천 AI 제품 & 도구</h2>\n<ul>\n${items}\n</ul>\n`
}

const PROMPT_FILES = [
  'system.md',
  'style.md',
  'hooks.md',
  'structure.md',
  'quality.md',
]

const loadSystemPrompt = (): string => {
  const promptsDir = path.resolve(__dirname, '../../prompts')

  const sections = PROMPT_FILES.map((file) => {
    const filePath = path.join(promptsDir, file)
    try {
      return fs.readFileSync(filePath, 'utf-8').trim()
    } catch {
      console.warn(`[Prompt] ${file} 로드 실패, 건너뜀`)
      return null
    }
  }).filter((s): s is string => s !== null)

  return sections.join('\n\n---\n\n')
}

let cachedPrompt: string | null = null

const getSystemPrompt = (): string => {
  if (!cachedPrompt) {
    cachedPrompt = loadSystemPrompt()
    console.log(`[Prompt] 시스템 프롬프트 로드 완료 (${cachedPrompt.length}자)`)
  }
  return cachedPrompt
}

const MODEL_PRICING = {
  inputPricePerMToken: 3,
  outputPricePerMToken: 15,
} as const
const USD_TO_KRW = 1350

const parseJsonResponse = (
  raw: string,
): { title: string; content: string; metaDescription: string } => {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : raw
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>

    const title = typeof parsed.title === 'string' ? parsed.title : ''
    const content = typeof parsed.content === 'string' ? parsed.content : ''
    const metaDescription =
      typeof parsed.metaDescription === 'string' ? parsed.metaDescription : ''

    if (!title || !content) {
      throw new Error('Missing required fields: title, content')
    }

    return { title, content, metaDescription }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `[Claude] JSON parse failed: ${message}. Raw: ${raw.slice(0, 200)}`,
    )
  }
}

export const generateContent = async (
  config: ContentBotConfig,
  keyword: string,
  products: CoupangProduct[],
): Promise<GeneratedContent> => {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey })

  const productContext =
    products.length > 0
      ? `\n\n관련 AI 제품/도구 (본문에 자연스럽게 녹여주세요):\n${products.map((p) => `- ${p.productName} (${p.productPrice.toLocaleString()}원)`).join('\n')}`
      : ''

  const userPrompt = `키워드: "${keyword}"${productContext}\n\n위 키워드로 SEO 최적화된 AI 블로그 글을 작성해주세요.`

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: getSystemPrompt(),
      messages: [{ role: 'user', content: userPrompt }],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`[Claude] API request failed: ${message}`)
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('[Claude] No text response received')
  }

  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  const costUsd =
    (inputTokens * MODEL_PRICING.inputPricePerMToken) / 1_000_000 +
    (outputTokens * MODEL_PRICING.outputPricePerMToken) / 1_000_000
  const costKrw = Math.round(costUsd * USD_TO_KRW * 100) / 100

  const parsed = parseJsonResponse(textBlock.text)

  // 혹시 남아있는 JSON-LD 제거 (WordPress.com은 <script> 태그를 제거하여 raw JSON이 노출됨)
  parsed.content = parsed.content.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
    '',
  )

  const productSection = buildProductSection(products)
  const fullContent = `${parsed.content}${productSection}`

  return {
    title: parsed.title,
    content: fullContent,
    metaDescription: parsed.metaDescription,
    tokenCost: costKrw,
  }
}
