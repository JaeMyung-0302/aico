import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  getMyProfile = async (userId: string) => {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        metaGold: true,
        gems: true,
        attendanceStreak: true,
        lastAttendanceDate: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  };

  updateDisplayName = async (userId: string, displayName: string) => {
    try {
      return await this.prisma.profile.update({
        where: { id: userId },
        data: { displayName },
        select: { id: true, displayName: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Profile not found');
      }
      throw error;
    }
  };
}
