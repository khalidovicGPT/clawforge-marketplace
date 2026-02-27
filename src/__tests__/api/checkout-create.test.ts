import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock rate-limit
vi.mock('@/lib/rate-limit', () => ({
  checkoutLimiter: null,
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

// Mock supabase server
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

// Mock supabase service
const mockServiceFrom = vi.fn();
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

// Mock ensure-profile
vi.mock('@/lib/ensure-profile', () => ({
  ensureUserProfile: vi.fn().mockResolvedValue({ id: 'user-1', role: 'user' }),
}));

// Mock download-tokens
vi.mock('@/lib/download-tokens', () => ({
  generateDownloadToken: vi.fn().mockResolvedValue({ token: 'dl_test', expiresAt: '2026-03-01' }),
}));

// Mock Stripe constructor
vi.mock('stripe', () => ({
  default: class MockStripe {
    customers = {
      list: vi.fn().mockResolvedValue({ data: [{ id: 'cus_123' }] }),
      create: vi.fn().mockResolvedValue({ id: 'cus_new' }),
    };
    checkout = {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session' }),
      },
    };
  },
}));

describe('POST /api/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    process.env.NEXT_PUBLIC_APP_URL = 'https://clawforge.io';
  });

  async function callCheckout(body: unknown, authenticated = true) {
    if (authenticated) {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@test.com' } },
        error: null,
      });
    } else {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    }

    const { POST } = await import('@/app/api/checkout/route');
    const request = new Request('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return POST(request as unknown as import('next/server').NextRequest);
  }

  it('retourne 401 si non authentifie', async () => {
    const response = await callCheckout({ skillId: 's1', price: 1000 }, false);
    expect(response.status).toBe(401);
  });

  it('retourne 400 si skillId manquant', async () => {
    const response = await callCheckout({ price: 1000 });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('manquants');
  });

  it('retourne 404 si skill non trouve', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.in = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockServiceFrom.mockReturnValue(chainable);

    const response = await callCheckout({ skillId: 's1', price: 1000 });
    expect(response.status).toBe(404);
  });

  it('gere un skill gratuit — cree le purchase', async () => {
    let callIndex = 0;
    mockServiceFrom.mockImplementation(() => {
      callIndex++;
      const chainable: Record<string, unknown> = {};
      chainable.select = vi.fn().mockReturnValue(chainable);
      chainable.eq = vi.fn().mockReturnValue(chainable);
      chainable.in = vi.fn().mockReturnValue(chainable);
      chainable.insert = vi.fn().mockReturnValue({ error: null });
      if (callIndex === 1) {
        // skills query
        chainable.single = vi.fn().mockResolvedValue({
          data: { id: 's1', title: 'Free Skill', price: 0, creator_id: 'c1', status: 'published' },
          error: null,
        });
      } else {
        // purchases query
        chainable.single = vi.fn().mockResolvedValue({ data: null, error: null });
      }
      return chainable;
    });

    const response = await callCheckout({ skillId: 's1', price: 0 });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.free).toBe(true);
  });

  it('retourne 403 si skill en pending_payment_setup', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.in = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({
      data: { id: 's1', title: 'Skill', price: 1000, creator_id: 'c1', status: 'pending_payment_setup' },
      error: null,
    });
    mockServiceFrom.mockReturnValue(chainable);

    const response = await callCheckout({ skillId: 's1', price: 1000 });
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toContain('paiements');
  });

  it('cree une session Stripe pour un skill payant', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.in = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({
      data: { id: 's1', title: 'Paid Skill', description_short: 'Desc', price: 1999, creator_id: 'c1', status: 'published' },
      error: null,
    });
    mockServiceFrom.mockReturnValue(chainable);

    const response = await callCheckout({ skillId: 's1', skillSlug: 'paid-skill', price: 1999 });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.url).toContain('stripe.com');
  });
});
