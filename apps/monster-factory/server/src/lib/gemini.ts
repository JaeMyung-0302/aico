import { GoogleGenAI } from '@google/genai'
import type { Element, GrowthStage, Personality } from '@monster-factory/shared'

const apiKey = process.env['GEMINI_API_KEY'] ?? ''

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

const buildPrompt = (
  element: Element,
  personality: Personality,
  growthStage: GrowthStage,
): string =>
  `Generate a simple SVG image of a cute ${growthStage} stage ${element}-type monster with ${personality} personality. ` +
  'Use chibi proportions, vibrant colors, simple shapes. 256x256 viewBox. ' +
  'Output ONLY the SVG code starting with <svg, no markdown fences, no explanation.'

export const generateMonsterImage = async (
  element: Element,
  personality: Personality,
  growthStage: GrowthStage,
): Promise<Buffer | null> => {
  if (!ai) {
    console.warn('[gemini] GEMINI_API_KEY not configured, skipping image generation')
    return null
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildPrompt(element, personality, growthStage),
    })

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text?.includes('<svg')) {
      console.warn('[gemini] No SVG in response')
      return null
    }

    const svgStart = text.indexOf('<svg')
    const svgEnd = text.lastIndexOf('</svg>') + '</svg>'.length
    const svg = text.substring(svgStart, svgEnd)

    return Buffer.from(svg, 'utf-8')
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[gemini] Image generation failed:', msg)
    return null
  }
}
