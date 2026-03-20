import { Request } from 'express'
import type { User } from '../../generated/prisma'

export interface AuthenticatedRequest extends Request {
  user: User
  tenantId?: string
}
