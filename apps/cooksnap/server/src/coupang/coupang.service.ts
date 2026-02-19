import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import CryptoJS from 'crypto-js';
import axios from 'axios';

export interface PurchaseLinkResult {
  ingredientId: string;
  ingredientName: string;
  purchaseUrl: string;
}

// 딥링크 캐시 (24시간 TTL)
const deepLinkCache = new Map<string, { url: string; expiry: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

@Injectable()
export class CoupangService {
  private readonly logger = new Logger(CoupangService.name);
  private readonly accessKey: string;
  private readonly secretKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accessKey = this.configService.get<string>('coupang.accessKey') || '';
    this.secretKey = this.configService.get<string>('coupang.secretKey') || '';

    if (!this.accessKey || !this.secretKey) {
      this.logger.warn(
        'COUPANG_ACCESS_KEY 또는 COUPANG_SECRET_KEY가 설정되지 않았습니다. Deep Link API가 비활성화됩니다.',
      );
    }
  }

  // 레시피의 재료별 구매 링크 생성
  getPurchaseLinks = async (recipeId: string): Promise<PurchaseLinkResult[]> => {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!recipe) return [];

    const results: PurchaseLinkResult[] = [];

    for (const ingredient of recipe.ingredients) {
      // 캐시 확인
      const cached = deepLinkCache.get(ingredient.name);
      if (cached && cached.expiry > Date.now()) {
        results.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          purchaseUrl: cached.url,
        });
        continue;
      }

      // 쿠팡 검색 URL 생성
      const searchUrl = this.generateSearchUrl(ingredient.name);

      // Deep Link API로 어필리에이트 추적 링크 변환
      let purchaseUrl = searchUrl;
      if (this.accessKey && this.secretKey) {
        try {
          const deepLink = await this.generateDeepLink(searchUrl);
          if (deepLink) {
            purchaseUrl = deepLink;
          }
        } catch {
          this.logger.warn(`딥링크 변환 실패: ${ingredient.name}, 일반 검색 URL 사용`);
        }
      }

      deepLinkCache.set(ingredient.name, { url: purchaseUrl, expiry: Date.now() + CACHE_TTL });

      // DB에 구매 링크 저장
      await this.prisma.ingredient.update({
        where: { id: ingredient.id },
        data: { coupangProductUrl: purchaseUrl },
      });

      results.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        purchaseUrl,
      });
    }

    return results;
  };

  // 쿠팡 검색 URL 생성
  private generateSearchUrl = (keyword: string): string => {
    const encoded = encodeURIComponent(keyword);
    return `https://www.coupang.com/np/search?component=&q=${encoded}`;
  };

  // 쿠팡파트너스 Deep Link API (2단계에서 사용 가능)
  private generateDeepLink = async (originalUrl: string): Promise<string | null> => {
    const path = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
    const method = 'POST';
    const authorization = this.generateSignature(method, path);

    try {
      const response = await axios.post(
        `https://api-gateway.coupang.com${path}`,
        { coupangUrls: [originalUrl] },
        {
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );

      const links = response.data?.data;
      if (links?.length > 0) {
        return links[0].shortenUrl;
      }

      return null;
    } catch (error) {
      this.logger.error('Deep Link API 호출 실패', error);
      return null;
    }
  };

  // HMAC 서명 생성
  private generateSignature = (method: string, path: string): string => {
    const datetime = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0] + 'Z';
    const message = `${datetime}${method}${path}`;
    const signature = CryptoJS.HmacSHA256(message, this.secretKey).toString(CryptoJS.enc.Hex);
    return `CEA algorithm=HmacSHA256, access-key=${this.accessKey}, signed-date=${datetime}, signature=${signature}`;
  };
}
