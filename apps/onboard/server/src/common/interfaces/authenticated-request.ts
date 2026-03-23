import { Request } from 'express'
import type { User, TenantMember } from '../../generated/prisma'

export interface AuthenticatedRequest extends Request {
  user: User
  tenantId?: string
  tenantMember?: TenantMember
}
