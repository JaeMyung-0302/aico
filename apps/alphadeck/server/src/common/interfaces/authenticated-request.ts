import { Request } from 'express';
import { Plan } from '../../generated/prisma';

export interface AuthenticatedUser {
  id: number;
  email: string;
  plan: Plan;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
