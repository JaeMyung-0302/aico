import { GoogleGenAI } from '@google/genai'

const apiKey = process.env['GEMINI_API_KEY']
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

interface FoodItemInput {
  name: string
  category: string
  expiryDate: string | null
  daysUntilExpiry: number | null
}

interface GeminiRecipe {
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  cookTime: number
  ingredients: { name: string; amount: string; unit: string }[]
  steps: string[]
}

const SYSTEM_INSTRUCTION = `당신은 한국 가정식 전문 요리사입니다.
사용자의 냉장고 재료 목록과 유통기한 정보를 받아 레시피를 추천합니다.

규칙:
1. [긴급] 태그가 붙은 유통기한 임박 재료를 반드시 1개 이상 사용하는 레시피를 우선 추천
2. 냉장고에 있는 재료만으로 만들 수 있는 레시피를 우선, 부족 재료는 최소한으로
3. 조리 시간 30분 이내의 실용적인 레시피 위주
4. 반드시 2~3개의 레시피를 추천
5. JSON 형식으로만 응답`

const buildPrompt = (items: FoodItemInput[]): string => {
  const ingredientList = items.map((item) => {
    const urgent = item.daysUntilExpiry !== null && item.daysUntilExpiry <= 3
    const tag = urgent ? ' [긴급]' : ''
    const expiry =
      item.daysUntilExpiry !== null ? ` (D-${item.daysUntilExpiry})` : ''
    return `- ${item.name} (${item.category})${expiry}${tag}`
  })

  return `냉장고 재료:\n${ingredientList.join('\n')}\n\n이 재료들로 만들 수 있는 레시피 2~3개를 추천해주세요.`
}

export const suggestRecipes = async (
  items: FoodItemInput[],
): Promise<GeminiRecipe[]> => {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const prompt = buildPrompt(items)

  const tryGenerate = async (): Promise<GeminiRecipe[]> => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object' as const,
          properties: {
            recipes: {
              type: 'array' as const,
              items: {
                type: 'object' as const,
                properties: {
                  name: { type: 'string' as const },
                  description: { type: 'string' as const },
                  difficulty: {
                    type: 'string' as const,
                    enum: ['easy', 'medium', 'hard'],
                  },
                  cookTime: { type: 'number' as const },
                  ingredients: {
                    type: 'array' as const,
                    items: {
                      type: 'object' as const,
                      properties: {
                        name: { type: 'string' as const },
                        amount: { type: 'string' as const },
                        unit: { type: 'string' as const },
                      },
                      required: ['name', 'amount', 'unit'],
                    },
                  },
                  steps: {
                    type: 'array' as const,
                    items: { type: 'string' as const },
                  },
                },
                required: [
                  'name',
                  'description',
                  'difficulty',
                  'cookTime',
                  'ingredients',
                  'steps',
                ],
              },
            },
          },
          required: ['recipes'],
        },
      },
    })

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error('Empty response from Gemini')
    }

    const parsed = JSON.parse(text) as { recipes: GeminiRecipe[] }
    if (!Array.isArray(parsed.recipes) || parsed.recipes.length === 0) {
      throw new Error('Invalid recipe response structure')
    }

    for (const r of parsed.recipes) {
      if (
        !r.name ||
        !r.difficulty ||
        !r.cookTime ||
        !Array.isArray(r.ingredients) ||
        !Array.isArray(r.steps)
      ) {
        throw new Error(
          `Invalid recipe: missing required fields in "${r.name ?? 'unknown'}"`,
        )
      }
    }

    return parsed.recipes
  }

  // 1회 재시도
  try {
    return await tryGenerate()
  } catch (firstError) {
    try {
      return await tryGenerate()
    } catch (secondError) {
      console.error(
        'Gemini retry also failed:',
        secondError instanceof Error ? secondError.message : secondError,
      )
      throw firstError
    }
  }
}
