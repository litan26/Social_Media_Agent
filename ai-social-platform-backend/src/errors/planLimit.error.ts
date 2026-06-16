export class PlanLimitError extends Error {
  readonly statusCode = 402;
  readonly code: 'ai_generation_limit' | 'account_limit';

  constructor(message: string, code: 'ai_generation_limit' | 'account_limit') {
    super(message);
    this.name = 'PlanLimitError';
    this.code = code;
  }
}

export function isPlanLimitError(err: unknown): err is PlanLimitError {
  return err instanceof PlanLimitError;
}
