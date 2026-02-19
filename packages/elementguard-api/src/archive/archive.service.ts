import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArchiveItem } from '../common/types';

@Injectable()
export class ArchiveService {
  constructor(private readonly prisma: PrismaService) {}

  async getArchive(userId: string): Promise<ArchiveItem[]> {
    const items = await this.prisma.archive.findMany({
      where: { userId },
      select: { itemType: true, itemId: true },
    });
    return items.map((item) => ({
      item_type: item.itemType as ArchiveItem['item_type'],
      item_id: item.itemId,
    }));
  }

  async addItem(userId: string, item: ArchiveItem): Promise<ArchiveItem> {
    const record = await this.prisma.archive.upsert({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType: item.item_type,
          itemId: item.item_id,
        },
      },
      update: {},
      create: {
        userId,
        itemType: item.item_type,
        itemId: item.item_id,
      },
    });
    return {
      item_type: record.itemType as ArchiveItem['item_type'],
      item_id: record.itemId,
    };
  }
}
