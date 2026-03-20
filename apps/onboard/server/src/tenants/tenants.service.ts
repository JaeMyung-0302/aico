import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  createTenant = async (name: string, slug: string, userId: string) => {
    const existing = await this.prisma.tenant.findUnique({ where: { slug } })
    if (existing) {
      throw new ConflictException('이미 사용 중인 slug입니다.')
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name,
        slug,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: { members: true },
    })

    return tenant
  }

  getTenant = async (tenantId: string, userId: string) => {
    const member = await this.prisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })
    if (!member) {
      throw new ForbiddenException('이 팀에 접근 권한이 없습니다.')
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { members: { include: { user: { select: { id: true, email: true, name: true } } } } },
    })
    if (!tenant) {
      throw new NotFoundException('팀을 찾을 수 없습니다.')
    }

    return tenant
  }

  inviteMember = async (tenantId: string, email: string, userId: string) => {
    const member = await this.prisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      throw new ForbiddenException('멤버를 초대할 권한이 없습니다.')
    }

    const invitee = await this.prisma.user.findUnique({ where: { email } })
    if (!invitee) {
      throw new NotFoundException('해당 이메일로 가입된 사용자가 없습니다.')
    }

    const existingMember = await this.prisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId: invitee.id, tenantId } },
    })
    if (existingMember) {
      throw new ConflictException('이미 팀에 소속된 멤버입니다.')
    }

    return this.prisma.tenantMember.create({
      data: { userId: invitee.id, tenantId, role: 'MEMBER' },
      include: { user: { select: { id: true, email: true, name: true } } },
    })
  }

  getMyTenants = async (userId: string) => {
    const memberships = await this.prisma.tenantMember.findMany({
      where: { userId },
      include: { tenant: true },
    })
    return memberships.map((m) => ({ ...m.tenant, role: m.role }))
  }
}
