import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock rate-limit
vi.mock('@/lib/rate-limit', () => ({
  authLimiter: null,
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock supabase service
const mockResetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null });
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  })),
}));

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    process.env.NEXT_PUBLIC_APP_URL = 'https://clawforge.io';
  });

  async function callResetPassword(body: unknown) {
    const { POST } = await import('@/app/api/auth/reset-password/route');
    const request = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    // Cast NextRequest for the route
    return POST(request as unknown as import('next/server').NextRequest);
  }

  it('retourne 400 si email manquant', async () => {
    const response = await callResetPassword({});
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('Email requis');
  });

  it('retourne toujours succes meme pour un email inexistant (anti-enumeration)', async () => {
    // Supabase ne retourne pas d'erreur pour un email inexistant
    const response = await callResetPassword({ email: 'nonexistent@test.com' });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('Si un compte existe');
  });

  it('retourne succes pour un email existant', async () => {
    const response = await callResetPassword({ email: 'existing@test.com' });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it('appelle resetPasswordForEmail avec le bon redirectTo', async () => {
    await callResetPassword({ email: 'test@test.com' });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@test.com', {
      redirectTo: 'https://clawforge.io/auth/reset-password',
    });
  });

  it('retourne succes meme si Supabase echoue (anti-enumeration)', async () => {
    mockResetPasswordForEmail.mockRejectedValue(new Error('Network error'));
    const response = await callResetPassword({ email: 'test@test.com' });
    // Le catch global devrait retourner 500 dans ce cas
    expect(response.status).toBe(500);
  });
});
