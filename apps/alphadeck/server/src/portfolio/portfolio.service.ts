import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const FREE_ITEM_LIMIT = 3;

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getPortfolios(userId: number) {
    return this.prisma.portfolio.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPortfolio(userId: number, name: string) {
    return this.prisma.portfolio.create({
      data: { userId, name },
    });
  }

  async addItem(
    userId: number,
    portfolioId: number,
    symbol: string,
    quantity: number,
    avgBuyPrice: number,
  ) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) throw new NotFoundException('포트폴리오를 찾을 수 없습니다');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const itemCount = await this.prisma.portfolioItem.count({
      where: { portfolioId },
    });

    if (user?.plan === 'FREE' && itemCount >= FREE_ITEM_LIMIT) {
      throw new ForbiddenException(
        `Free 플랜은 최대 ${FREE_ITEM_LIMIT}종목까지 등록 가능합니다. Pro로 업그레이드하세요.`,
      );
    }

    return this.prisma.portfolioItem.create({
      data: {
        portfolioId,
        symbol: symbol.toUpperCase(),
        quantity,
        avgBuyPrice,
      },
    });
  }

  async removeItem(userId: number, portfolioId: number, itemId: number) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) throw new NotFoundException('포트폴리오를 찾을 수 없습니다');

    return this.prisma.portfolioItem.delete({ where: { id: itemId } });
  }
}
