import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { PrismaService } from '../prisma/prisma.service'

export interface PriceResult {
  ingredientId: string
  name: string
  price: number | null
  unit: string | null
}

interface CachedItem {
  itemName: string
  itemCode: string
  kindCode: string
  kindName: string
  categoryCode: string
  unit: string
  price: number | null
}

// 카테고리별 캐시 (6시간 TTL)
const itemCache = new Map<string, CachedItem[]>()
let cacheExpiry = 0
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6시간

// KAMIS API에서 조회 가능한 카테고리
const CATEGORIES = ['100', '200', '300', '400', '500', '600']

@Injectable()
export class KamisService implements OnModuleInit {
  private readonly logger = new Logger(KamisService.name)
  private readonly apiKey: string
  private readonly apiId: string
  private loading: Promise<void> | null = null

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('kamis.apiKey') || ''
    this.apiId = this.configService.get<string>('kamis.apiId') || ''
  }

  onModuleInit = async () => {
    // 서버 시작 시 백그라운드로 캐시 워밍
    if (this.apiKey && this.apiId) {
      this.refreshCache().catch((err) =>
        this.logger.warn(`초기 캐시 로딩 실패: ${err.message}`),
      )
    }
  }

  // 레시피의 재료별 시세 조회
  getRecipePrices = async (recipeId: string): Promise<PriceResult[]> => {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!recipe) return []

    // 캐시가 비었거나 만료되었으면 갱신
    await this.ensureCache()

    const results: PriceResult[] = []
    const priceUpdates: {
      id: string
      estimatedPrice: number
      kamisItemCode: string
    }[] = []

    for (const ingredient of recipe.ingredients) {
      const match = this.findMatch(ingredient.name)

      if (!match) {
        results.push({
          ingredientId: ingredient.id,
          name: ingredient.name,
          price: null,
          unit: ingredient.unit,
        })
        continue
      }

      results.push({
        ingredientId: ingredient.id,
        name: ingredient.name,
        price: match.price,
        unit: match.unit,
      })

      if (match.price !== null) {
        priceUpdates.push({
          id: ingredient.id,
          estimatedPrice: match.price,
          kamisItemCode: match.itemCode,
        })
      }
    }

    // 배치 UPDATE (N+1 → 1 트랜잭션)
    const totalPrice = results.reduce((sum, r) => sum + (r.price || 0), 0)
    if (priceUpdates.length > 0 || totalPrice > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const { id, estimatedPrice, kamisItemCode } of priceUpdates) {
          await tx.ingredient.update({
            where: { id },
            data: { estimatedPrice, kamisItemCode },
          })
        }
        if (totalPrice > 0) {
          await tx.recipe.update({
            where: { id: recipeId },
            data: { totalPrice },
          })
        }
      })
    }

    return results
  }

  // Stale-While-Revalidate: 캐시가 있으면 즉시 반환, 만료 시 백그라운드 갱신
  private ensureCache = async (): Promise<void> => {
    // 캐시가 유효하면 그대로 사용
    if (cacheExpiry > Date.now() && itemCache.size > 0) return

    // 캐시가 있지만 만료됨 → 기존 캐시 유지 + 백그라운드 갱신
    if (itemCache.size > 0) {
      if (!this.loading) {
        this.loading = this.refreshCache().finally(() => {
          this.loading = null
        })
      }
      return // 만료된 캐시로 즉시 응답
    }

    // 캐시가 완전히 비어있음 (서버 최초 시작) → 대기 필요
    if (this.loading) {
      await this.loading
      return
    }

    this.loading = this.refreshCache()
    try {
      await this.loading
    } finally {
      this.loading = null
    }
  }

  // 전체 카테고리 가격 캐시 갱신
  private refreshCache = async (): Promise<void> => {
    if (!this.apiKey || !this.apiId) {
      this.logger.warn('KAMIS API 키가 설정되지 않았습니다.')
      return
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    for (const categoryCode of CATEGORIES) {
      try {
        const items = await this.fetchCategory(categoryCode, yesterday)
        if (items.length > 0) {
          itemCache.set(categoryCode, items)
          this.logger.log(
            `KAMIS 카테고리 ${categoryCode}: ${items.length}개 품목 캐시`,
          )
        }
        // rate limit 방지
        await new Promise((r) => setTimeout(r, 500))
      } catch (error) {
        this.logger.warn(`카테고리 ${categoryCode} 조회 실패, 재시도...`)
        // 한 번 더 시도 (간격 늘려서)
        await new Promise((r) => setTimeout(r, 2000))
        try {
          const items = await this.fetchCategory(categoryCode, yesterday)
          if (items.length > 0) {
            itemCache.set(categoryCode, items)
          }
        } catch {
          this.logger.error(`카테고리 ${categoryCode} 최종 실패`)
        }
      }
    }

    cacheExpiry = Date.now() + CACHE_TTL
    const totalItems = [...itemCache.values()].reduce(
      (sum, arr) => sum + arr.length,
      0,
    )
    this.logger.log(`KAMIS 캐시 완료: 총 ${totalItems}개 품목`)
  }

  // 카테고리별 일일 가격 조회
  private fetchCategory = async (
    categoryCode: string,
    regday: string,
  ): Promise<CachedItem[]> => {
    const response = await axios.get(
      'https://www.kamis.or.kr/service/price/xml.do?action=dailyPriceByCategoryList',
      {
        params: {
          p_cert_key: this.apiKey,
          p_cert_id: this.apiId,
          p_returntype: 'json',
          p_product_cls_code: '01', // 소매
          p_regday: regday,
          p_item_category_code: categoryCode,
        },
        timeout: 15000,
      },
    )

    const data = response.data
    const rawItems = data?.data?.item
    if (!Array.isArray(rawItems)) return []

    const results: CachedItem[] = []
    const seen = new Set<string>()

    for (const item of rawItems) {
      // 품목+품종 기준 중복 제거 (첫 번째 등급만 사용)
      const key = `${item.item_code}-${item.kind_code}`
      if (seen.has(key)) continue
      seen.add(key)

      // 가격 파싱 (dpr1=당일, dpr2=전일, dpr3=1주전 순으로 fallback)
      const price =
        this.parsePrice(item.dpr1) ??
        this.parsePrice(item.dpr2) ??
        this.parsePrice(item.dpr3)

      results.push({
        itemName: item.item_name,
        itemCode: item.item_code,
        kindCode: item.kind_code,
        kindName: item.kind_name,
        categoryCode,
        unit: item.unit,
        price,
      })
    }

    return results
  }

  // 가격 문자열 → 숫자 파싱
  private parsePrice = (raw: string | undefined): number | null => {
    if (!raw || raw === '-') return null
    const num = parseInt(raw.replace(/,/g, ''), 10)
    return isNaN(num) ? null : num
  }

  // KAMIS item_name에서 괄호 및 접두사 제거 (예: "깐마늘(국산)" → "마늘")
  private normalizeItemName = (itemName: string): string => {
    return itemName
      .replace(/\(.*?\)/g, '') // 괄호 제거
      .replace(/^(깐|마른|수입\s?)/, '') // 접두사 제거
      .trim()
  }

  // 재료명에서 조리법 접두사 제거 (예: "다진 마늘" → "마늘")
  private normalizeIngredientName = (name: string): string => {
    return name
      .replace(
        /^(다진|썬|채썬|슬라이스|간|갈은|삶은|데친|볶은|구운|튀긴)\s?/,
        '',
      )
      .trim()
  }

  // 재료명으로 캐시에서 가격 검색 (fuzzy matching)
  findMatch = (ingredientName: string): CachedItem | null => {
    const allItems = [...itemCache.values()].flat()
    if (allItems.length === 0) return null

    const name = ingredientName.trim()
    const cleanName = this.normalizeIngredientName(name)

    // 1. 정확히 일치
    const exact = allItems.find(
      (item) => item.itemName === name || item.itemName === cleanName,
    )
    if (exact) return exact

    // 2. 정규화된 이름으로 매칭 (예: "깐마늘(국산)" → "마늘" === "다진 마늘" → "마늘")
    const normalizedMatch = allItems.find(
      (item) => this.normalizeItemName(item.itemName) === cleanName,
    )
    if (normalizedMatch) return normalizedMatch

    // 3. 재료명이 KAMIS 품목명을 포함 (예: "대파 1대" → "파")
    // 긴 이름부터 매칭하여 "고춧가루"가 "고추"보다 먼저 매칭되도록
    const sortedByNameLength = [...allItems].sort(
      (a, b) => b.itemName.length - a.itemName.length,
    )

    for (const item of sortedByNameLength) {
      if (
        cleanName.includes(item.itemName) ||
        cleanName.includes(this.normalizeItemName(item.itemName))
      ) {
        return item
      }
    }

    // 4. KAMIS 품목명(정규화)이 재료명을 포함 (예: "마른멸치" → "멸치")
    for (const item of sortedByNameLength) {
      const normalized = this.normalizeItemName(item.itemName)
      if (item.itemName.includes(cleanName) || normalized.includes(cleanName)) {
        return item
      }
    }

    // 5. 별칭 매칭
    const aliases: Record<string, string[]> = {
      계란: ['계란', '달걀'],
      달걀: ['계란', '달걀'],
      대파: ['파'],
      소고기: ['소'],
      돼지고기: ['돼지'],
      닭고기: ['닭'],
      청양고추: ['풋고추'],
      애호박: ['호박'],
    }

    const altNames = aliases[cleanName] || aliases[name]
    if (altNames) {
      for (const alt of altNames) {
        const found = allItems.find(
          (item) =>
            item.itemName === alt ||
            this.normalizeItemName(item.itemName) === alt,
        )
        if (found) return found
      }
    }

    return null
  }
}
