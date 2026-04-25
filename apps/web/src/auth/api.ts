import type { AuthUser } from '@kuidy/shared';
import { api } from '@/lib/api';

interface AuthResponse {
  user: AuthUser;
  token: string;
}

export const authApi = {
  register: (input: { email: string; password: string; name?: string }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', body: input }),
  login: (input: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: input }),
  me: () => api<{ user: AuthUser }>('/auth/me'),
};
