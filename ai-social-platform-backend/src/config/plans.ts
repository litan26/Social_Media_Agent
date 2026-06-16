export const PLANS = ['free', 'pro', 'team'] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_LIMITS: Record<
  Plan,
  { maxAccounts: number; aiGenerationsPerMonth: number }
> = {
  free: { maxAccounts: 7, aiGenerationsPerMonth: 5 },
  pro: { maxAccounts: 10, aiGenerationsPerMonth: 100 },
  team: { maxAccounts: 50, aiGenerationsPerMonth: 500 },
};
