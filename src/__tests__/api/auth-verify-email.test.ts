import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock verification token
const mockVerifyToken = vi.fn();
vi.mock('@/lib/verification-token', () => ({
  verifyVerificationToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

// Mock supabase service
const mockUpdateUser = vi.fn();
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    auth: {
      admin: {
        updateUserById: mockUpdateUser,
      },
    },
  })),
}));

describe('GET /api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ error: null });
  });

  async function callVerifyEmail(token?: string) {
    const { GET } = await import('@/app/api/auth/verify-email/route');
    const url = token
      ? `http://localhost:3000/api/auth/verify-email?token=${token}`
      : 'http://localhost:3000/api/auth/verify-email';
    const parsedUrl = new URL(url);
    const request = new Request(url);
    // NextRequest has a nextUrl property that plain Request doesn't
    Object.defineProperty(request, 'nextUrl', { value: parsedUrl });
    return GET(request as unknown as import('next/server').NextRequest);
  }

  it('redirige vers erreur si token manquant', async () => {
    const response = await callVerifyEmail();
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=missing-token');
  });

  it('redirige vers erreur si token invalide', async () => {
    mockVerifyToken.mockReturnValue(null);
    const response = await callVerifyEmail('invalid-token');
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=invalid-token');
  });

  it('confirme l email et redirige vers login', async () => {
    mockVerifyToken.mockReturnValue('user-123');
    const response = await callVerifyEmail('valid-token');
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('login?verified=true');
    expect(mockUpdateUser).toHaveBeenCalledWith('user-123', { email_confirm: true });
  });

  it('redirige vers erreur si Supabase echoue', async () => {
    mockVerifyToken.mockReturnValue('user-123');
    mockUpdateUser.mockResolvedValue({ error: { message: 'Server error' } });
    const response = await callVerifyEmail('valid-token');
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('error=server');
  });
});
