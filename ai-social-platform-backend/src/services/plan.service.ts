import { pool, setCurrentUser } from '../db/connection.js';
import { PLAN_LIMITS, PLANS, type Plan } from '../config/plans.js';
import { PlanLimitError } from '../errors/planLimit.error.js';

export class PlanService {
  /** Plan from DB — never trust client-sent plan values. */
  static async getPlanForUser(userId: number): Promise<Plan> {
    await setCurrentUser(userId);
    const result = await pool.query('SELECT plan, role FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (user?.role === 'superadmin') return 'team';
    const plan = user?.plan || 'free';
    return PLANS.includes(plan as Plan) ? (plan as Plan) : 'free';
  }

  /** Resolve plan: JWT hint optional, DB is source of truth for enforcement. */
  static async resolvePlan(userId: number, jwtPlan?: string | null): Promise<Plan> {
    const dbPlan = await this.getPlanForUser(userId);
    if (jwtPlan && jwtPlan !== dbPlan && PLANS.includes(jwtPlan as Plan)) {
      return dbPlan;
    }
    return dbPlan;
  }

  static async getMonthlyGenerationCount(userId: number): Promise<number> {
    await setCurrentUser(userId);
    const result = await pool.query(
      `SELECT COUNT(*) AS count
       FROM posts
       WHERE user_id = $1
         AND MONTH(created_at) = MONTH(NOW())
         AND YEAR(created_at) = YEAR(NOW())`,
      [userId]
    );
    return Number((result.rows[0] as { count: number }).count);
  }

  static async getMonthlyNonDraftCount(userId: number): Promise<number> {
    await setCurrentUser(userId);
    const result = await pool.query(
      `SELECT COUNT(*) AS count
       FROM posts
       WHERE user_id = $1
         AND status != 'draft'
         AND MONTH(created_at) = MONTH(NOW())
         AND YEAR(created_at) = YEAR(NOW())`,
      [userId]
    );
    return Number((result.rows[0] as { count: number }).count);
  }

  static async getConnectedAccountCount(userId: number): Promise<number> {
    await setCurrentUser(userId);
    const result = await pool.query(
      'SELECT COUNT(*) AS count FROM social_accounts WHERE user_id = $1',
      [userId]
    );
    return Number((result.rows[0] as { count: number }).count);
  }

  static async assertAiGenerationAllowed(userId: number, jwtPlan?: string | null): Promise<void> {
    const plan = await this.resolvePlan(userId, jwtPlan);
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0]?.role === 'superadmin') return;

    const limit = PLAN_LIMITS[plan].aiGenerationsPerMonth;
    const count = await this.getMonthlyGenerationCount(userId);

    if (count >= limit) {
      throw new PlanLimitError(
        `Monthly AI generation limit reached (${limit} for ${plan} plan)`,
        'ai_generation_limit'
      );
    }
  }

  static async assertAccountConnectAllowed(userId: number, jwtPlan?: string | null): Promise<void> {
    const plan = await this.resolvePlan(userId, jwtPlan);
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0]?.role === 'superadmin') return;

    const limit = PLAN_LIMITS[plan].maxAccounts;
    const count = await this.getConnectedAccountCount(userId);

    if (count >= limit) {
      throw new PlanLimitError(
        `Plan limit: max ${limit} connected accounts on ${plan} plan`,
        'account_limit'
      );
    }
  }

  static async getUsage(userId: number, jwtPlan?: string | null) {
    const plan = await this.resolvePlan(userId, jwtPlan);
    const limits = PLAN_LIMITS[plan];
    const [aiGenerations, nonDraftPosts, accounts] = await Promise.all([
      this.getMonthlyGenerationCount(userId),
      this.getMonthlyNonDraftCount(userId),
      this.getConnectedAccountCount(userId),
    ]);

    return {
      plan,
      limits,
      usage: {
        aiGenerationsThisMonth: aiGenerations,
        nonDraftPostsThisMonth: nonDraftPosts,
        connectedAccounts: accounts,
      },
    };
  }
}
