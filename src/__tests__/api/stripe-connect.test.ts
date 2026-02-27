import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase server
const mockGetUser = vi.fn();
const mockUserFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockUserFrom,
  }),
}));

// Mock ensure-profile
const mockEnsureProfile = vi.fn();
vi.mock('@/lib/ensure-profile', () => ({
  ensureUserProfile: (...args: unknown[]) => mockEnsureProfile(...args),
}));

// Mock stripe
const mockIsAccountOnboarded = vi.fn();
vi.mock('@/lib/stripe', () => ({
  stripe: { accounts: { list: vi.fn() } },
  createConnectAccount: vi.fn().mockResolvedValue({ id: 'acct_test_123' }),
  createAccountLink: vi.fn().mockResolvedValue({ url: 'https://connect.stripe.com/onboard' }),
  isAccountOnboarded: (...args: unknown[]) => mockIsAccountOnboarded(...args),
}));

describe('GET /api/stripe/connect/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function callStatus() {
    const { GET } = await import('@/app/api/stripe/connect/status/route');
    const request = new Request('http://localhost:3000/api/stripe/connect/status');
    return GET();
  }

  it('retourne 401 si non authentifie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await callStatus();
    expect(response.status).toBe(401);
  });

  it('retourne no_account si pas de stripe_account_id', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockUserFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { stripe_account_id: null, stripe_onboarding_complete: false },
            error: null,
          }),
        }),
      }),
    });

    const response = await callStatus();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('no_account');
  });

  it('retourne complete si onboarding deja fait', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockUserFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { stripe_account_id: 'acct_123', stripe_onboarding_complete: true },
            error: null,
          }),
        }),
      }),
    });

    const response = await callStatus();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('complete');
  });

  it('retourne pending si onboarding en cours', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockUserFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { stripe_account_id: 'acct_123', stripe_onboarding_complete: false },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockIsAccountOnboarded.mockResolvedValue(false);

    const response = await callStatus();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('pending');
  });
});

describe('POST /api/admin/promote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET_KEY = 'admin-secret-123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  });

  // Mock supabase-js pour le admin client
  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    })),
  }));

  async function callPromote(body: unknown) {
    const { POST } = await import('@/app/api/admin/promote/route');
    const request = new Request('http://localhost:3000/api/admin/promote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return POST(request as unknown as import('next/server').NextRequest);
  }

  it('retourne 401 si non authentifie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await callPromote({ secret: 'admin-secret-123' });
    expect(response.status).toBe(401);
  });

  it('retourne 403 si mauvais secret', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    });
    const response = await callPromote({ secret: 'wrong-secret' });
    expect(response.status).toBe(403);
  });

  it('retourne 403 si secret vide', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    });
    const response = await callPromote({ secret: '' });
    expect(response.status).toBe(403);
  });

  it('retourne 403 si ADMIN_SECRET_KEY non defini', async () => {
    delete process.env.ADMIN_SECRET_KEY;
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    });
    const response = await callPromote({ secret: 'any-secret' });
    expect(response.status).toBe(403);
  });

  it('promeut avec le bon secret', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    });
    const response = await callPromote({ secret: 'admin-secret-123' });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });
});
