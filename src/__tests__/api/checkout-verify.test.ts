import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase server
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

// Mock supabase service
const mockServiceSelect = vi.fn();
const mockServiceInsert = vi.fn();
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockServiceSelect,
      insert: mockServiceInsert,
    })),
  })),
}));

// Mock stripe lib
vi.mock('@/lib/stripe', () => ({
  calculatePlatformFee: vi.fn((amount: number) => Math.round(amount * 0.2)),
}));

// Mock Stripe constructor
const mockRetrieveSession = vi.fn();
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      checkout = {
        sessions: {
          retrieve: mockRetrieveSession,
        },
      };
    },
  };
});

describe('GET /api/checkout/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

    // Utilisateur authentifie par defaut
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@test.com' } },
      error: null,
    });

    // Mock chainable : from().select().eq().eq().single() etc.
    const chainable: Record<string, unknown> = {};
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({
      data: { id: 'skill-1', title: 'Test Skill', description_short: 'Desc', file_url: '/file.zip', version: '1.0' },
      error: null,
    });
    mockServiceSelect.mockReturnValue(chainable);
    mockServiceInsert.mockReturnValue({ error: null });
  });

  async function callVerify(sessionId?: string) {
    const { GET } = await import('@/app/api/checkout/verify/route');
    const url = sessionId
      ? `http://localhost:3000/api/checkout/verify?session_id=${sessionId}`
      : 'http://localhost:3000/api/checkout/verify';
    const request = new Request(url);
    return GET(request as unknown as import('next/server').NextRequest);
  }

  it('retourne 400 si session_id manquant', async () => {
    const response = await callVerify();
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('Session ID');
  });

  it('retourne 401 si non authentifie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await callVerify('cs_test_123');
    expect(response.status).toBe(401);
  });

  it('retourne 403 si session appartient a un autre utilisateur (IDOR)', async () => {
    mockRetrieveSession.mockResolvedValue({
      payment_status: 'paid',
      metadata: { skill_id: 'skill-1', user_id: 'user-OTHER' },
      amount_total: 1000,
      currency: 'eur',
      payment_intent: 'pi_123',
    });

    const response = await callVerify('cs_test_123');
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toContain('non autorisee');
  });

  it('retourne succes si session appartient au bon utilisateur', async () => {
    mockRetrieveSession.mockResolvedValue({
      payment_status: 'paid',
      metadata: { skill_id: 'skill-1', user_id: 'user-123' },
      amount_total: 1000,
      currency: 'eur',
      payment_intent: 'pi_123',
    });

    const response = await callVerify('cs_test_123');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.skill).toBeDefined();
  });

  it('retourne 400 si paiement non confirme', async () => {
    mockRetrieveSession.mockResolvedValue({
      payment_status: 'unpaid',
      metadata: { skill_id: 'skill-1', user_id: 'user-123' },
    });

    const response = await callVerify('cs_test_123');
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('non confirmé');
  });
});
