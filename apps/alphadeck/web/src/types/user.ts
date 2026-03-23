export type Plan = 'FREE' | 'PRO' | 'MAX';

export interface User {
  id: number;
  email: string;
  nickname: string;
  plan: Plan;
}
