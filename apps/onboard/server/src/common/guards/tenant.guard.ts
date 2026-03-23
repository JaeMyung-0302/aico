import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  canActivate = async (context: ExecutionContext): Promise<boolean> => {
    const request = context.switchToHttp().getRequest()
    const tenantId = request.headers['x-tenant-id']

    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException('x-tenant-id 헤더가 필요합니다.')
    }

    const userId = request.user?.id
    if (!userId) {
      throw new BadRequestException('인증된 사용자 정보가 필요합니다.')
    }

    const member = await this.prisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })
    if (!member) {
      throw new ForbiddenException('이 팀에 접근 권한이 없습니다.')
    }

    request.tenantMember = member
    return true
  }
}
