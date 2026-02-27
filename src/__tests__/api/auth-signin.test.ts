import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock rate-limit
vi.mock('@/lib/rate-limit', () => ({
  authLimiter: null,
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock supabase server
const mockSignIn = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { signInWithPassword: mockSignIn },
    from: mockFrom,
  }),
}));

describe('POST /api/auth/signin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function callSignin(body: unknown) {
    const { POST } = await import('@/app/api/auth/signin/route');
    const request = new Request('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return POST(request as unknown as import('next/server').NextRequest);
  }

  it('retourne 400 si email manquant', async () => {
    const response = await callSignin({ password: '12345678' });
    expect(response.status).toBe(400);
  });

  it('retourne 400 si password manquant', async () => {
    const response = await callSignin({ email: 'test@test.com' });
    expect(response.status).toBe(400);
  });

  it('retourne 401 pour mauvais credentials', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });
    const response = await callSignin({ email: 'test@test.com', password: 'wrong' });
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toContain('incorrect');
  });

  it('retourne 403 si email non confirme', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email not confirmed' },
    });
    const response = await callSignin({ email: 'test@test.com', password: 'pass123' });
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.code).toBe('EMAIL_NOT_CONFIRMED');
  });

  it('retourne succes avec user et session', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: 'u-1', email: 'test@test.com' },
        session: { access_token: 'token' },
      },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'u-1', role: 'user' },
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({ error: null }),
    });

    const response = await callSignin({ email: 'test@test.com', password: 'pass123' });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.user).toBeDefined();
    expect(json.session).toBeDefined();
  });
});
