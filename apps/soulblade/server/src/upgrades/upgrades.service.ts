import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PurchaseUpgradeDto } from './dto/purchase-upgrade.dto'

const PERMANENT_STAT_BASE_COST = 50
const PERMANENT_STAT_COST_GROWTH = 1.3
const MAX_PERMANENT_STAT_LEVEL = 20

const STAT_COLUMNS: Record<string, string> = {
  hp: 'permanent_hp',
  atk: 'permanent_atk',
  def: 'permanent_def',
  spd: 'permanent_spd',
  crit: 'permanent_crit',
}

const ALLOWED_COLUMNS = new Set(Object.values(STAT_COLUMNS))

const calcCost = (currentLevel: number): number =>
  Math.floor(
    PERMANENT_STAT_BASE_COST *
      Math.pow(PERMANENT_STAT_COST_GROWTH, currentLevel),
  )

@Injectable()
export class UpgradesService {
  constructor(private readonly prisma: PrismaService) {}

  purchaseUpgrade = async (userId: string, dto: PurchaseUpgradeDto) => {
    const column = STAT_COLUMNS[dto.statType]
    if (!column || !ALLOWED_COLUMNS.has(column)) {
      throw new BadRequestException('Invalid stat type')
    }

    // 모든 캐릭터의 해당 스탯 레벨 조회
    const characters = await this.prisma.character.findMany({
      where: { userId },
      select: {
        id: true,
        permanentHp: true,
        permanentAtk: true,
        permanentDef: true,
        permanentSpd: true,
        permanentCrit: true,
      },
    })

    if (characters.length === 0) {
      throw new BadRequestException('No characters found')
    }

    // 영구 스탯은 계정 단위이므로 첫 캐릭터 기준
    const camelKey =
      `permanent${dto.statType.charAt(0).toUpperCase()}${dto.statType.slice(1)}` as keyof (typeof characters)[0]
    const currentLevel = (characters[0]?.[camelKey] as number) ?? 0

    if (currentLevel >= MAX_PERMANENT_STAT_LEVEL) {
      throw new BadRequestException('Max level reached')
    }

    const cost = calcCost(currentLevel)
    const charIds = characters.map((c) => c.id)

    // 트랜잭션: 골드 차감 + 스탯 업그레이드 (실패 시 자동 롤백)
    await this.prisma.$transaction(async (tx) => {
      try {
        await tx.$queryRaw`SELECT sb_deduct_meta_gold(${userId}::uuid, ${cost})`
      } catch {
        throw new BadRequestException({
          error: 'Insufficient meta gold',
          required: cost,
        })
      }

      await tx.$executeRawUnsafe(
        `UPDATE sb_characters SET ${column} = $1 WHERE id = ANY($2::uuid[])`,
        currentLevel + 1,
        charIds,
      )
    })

    // 업그레이드 후 잔액 조회
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: { metaGold: true },
    })

    return {
      statType: dto.statType,
      newLevel: currentLevel + 1,
      cost,
      remainingGold: profile?.metaGold ?? 0,
    }
  }
}
