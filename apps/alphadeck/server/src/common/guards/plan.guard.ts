import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Plan } from '../../generated/prisma';

export const PLAN_KEY = 'requiredPlan';
export const RequirePlan = (...plans: Plan[]) => SetMetadata(PLAN_KEY, plans);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPlans = this.reflector.getAllAndOverride<Plan[]>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlans || requiredPlans.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userPlan = request.user?.plan;

    if (!userPlan || !requiredPlans.includes(userPlan)) {
      throw new ForbiddenException(
        `이 기능은 ${requiredPlans.join(' 또는 ')} 플랜 이상에서 사용 가능합니다.`,
      );
    }

    return true;
  }
}
