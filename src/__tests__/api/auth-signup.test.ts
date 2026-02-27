import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock rate-limit
vi.mock('@/lib/rate-limit', () => ({
  authLimiter: null,
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock n8n email
vi.mock('@/lib/n8n', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildVerificationEmail: vi.fn().mockReturnValue('<html>Verify</html>'),
}));

// Mock verification token
vi.mock('@/lib/verification-token', () => ({
  generateVerificationToken: vi.fn().mockReturnValue('mock-token-123'),
}));

// Mock supabase service client
const mockCreateUser = vi.fn();
const mockInsert = vi.fn();
const mockGetUserById = vi.fn();
const mockSelectFromUsers = vi.fn();

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        getUserById: mockGetUserById,
      },
    },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          insert: mockInsert.mockReturnValue({ error: null }),
          select: mockSelectFromUsers.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    }),
  })),
}));

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://clawforge.io';
    process.env.ADMIN_SECRET_KEY = 'test-secret';
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@test.com' } },
      error: null,
    });
    mockInsert.mockReturnValue({ error: null });
  });

  async function callSignup(body: unknown) {
    const { POST } = await import('@/app/api/auth/signup/route');
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return POST(request as unknown as import('next/server').NextRequest);
  }

  it('retourne 400 si champs manquants', async () => {
    const response = await callSignup({ email: 'test@test.com' });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('requis');
  });

  it('retourne 400 si password trop court', async () => {
    const response = await callSignup({
      email: 'test@test.com',
      password: '1234567',
      name: 'Test',
    });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('8 caractères');
  });

  it('cree un utilisateur avec succes', async () => {
    const response = await callSignup({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test User',
    });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('vérification');
  });

  it('appelle createUser avec email_confirm: false', async () => {
    await callSignup({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test User',
    });
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@test.com',
        password: 'password123',
        email_confirm: false,
      })
    );
  });

  it('retourne erreur si email deja utilise (et compte verifie)', async () => {
    mockCreateUser.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    });
    // Simuler un compte verifie
    mockSelectFromUsers.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'user-123', name: 'Existing' }, error: null }),
      }),
    });
    mockGetUserById.mockResolvedValue({
      data: { user: { email_confirmed_at: '2026-01-01T00:00:00Z' } },
    });

    const response = await callSignup({
      email: 'existing@test.com',
      password: 'password123',
      name: 'Test',
    });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('déjà utilisé');
  });
});
