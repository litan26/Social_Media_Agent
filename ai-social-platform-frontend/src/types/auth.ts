export type UserRole = 'superadmin' | 'user';

export interface RegisterPayload {
  email: string;
  phone: string;
  password: string;
  plan: 'free' | 'pro' | 'team';
}

export interface User {
  id: number;
  email: string;
  phone_number?: string | null;
  role: UserRole;
  plan: 'free' | 'pro' | 'team' | null;
  industry?: string;
  business_type?: string;
  voice_tone_preference?: Record<string, unknown>;
  logo_url?: string | null;
  created_at?: string;
}

export interface AuthResponse {
  userId: number;
  token: string;
  email: string;
  plan: string | null;
  role: UserRole;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  plan?: 'free' | 'pro' | 'team';
}
