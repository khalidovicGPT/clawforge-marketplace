import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('POST /api/refunds/request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com' } },
      error: null,
    });
  });

  async function callRefund(body: unknown) {
    const { POST } = await import('@/app/api/refunds/request/route');
    const request = new Request('http://localhost:3000/api/refunds/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return POST(request as unknown as import('next/server').NextRequest);
  }

  it('retourne 401 si non authentifie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await callRefund({ purchaseId: 'p1', reason: 'Not working properly' });
    expect(response.status).toBe(401);
  });

  it('retourne 400 si parametres manquants', async () => {
    const response = await callRefund({ purchaseId: 'p1' });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('manquants');
  });

  it('retourne 400 si raison trop courte', async () => {
    const response = await callRefund({ purchaseId: 'p1', reason: 'court' });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('10 caractères');
  });

  it('retourne 404 si achat non trouve', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockServiceFrom.mockReturnValue(chainable);

    const response = await callRefund({ purchaseId: 'p1', reason: 'This skill doesnt work at all' });
    expect(response.status).toBe(404);
  });

  it('retourne 400 si achat gratuit', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({
      data: { id: 'p1', user_id: 'user-1', price_paid: 0, payment_status: 'paid', purchased_at: new Date().toISOString() },
      error: null,
    });
    mockServiceFrom.mockReturnValue(chainable);

    const response = await callRefund({ purchaseId: 'p1', reason: 'This skill doesnt work at all' });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('gratuit');
  });

  it('retourne 400 si deja rembourse', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({
      data: { id: 'p1', user_id: 'user-1', price_paid: 1000, payment_status: 'refunded', purchased_at: new Date().toISOString() },
      error: null,
    });
    mockServiceFrom.mockReturnValue(chainable);

    const response = await callRefund({ purchaseId: 'p1', reason: 'This skill doesnt work at all' });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('remboursé');
  });

  it('retourne 400 si deja verse au createur', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({
      data: { id: 'p1', user_id: 'user-1', price_paid: 1000, payment_status: 'paid', purchased_at: new Date().toISOString() },
      error: null,
    });
    mockServiceFrom.mockReturnValue(chainable);

    const response = await callRefund({ purchaseId: 'p1', reason: 'This skill doesnt work at all' });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('versé au créateur');
  });

  it('retourne 400 si delai de 15 jours depasse', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20);

    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({
      data: { id: 'p1', user_id: 'user-1', price_paid: 1000, payment_status: 'pending', purchased_at: oldDate.toISOString() },
      error: null,
    });
    mockServiceFrom.mockReturnValue(chainable);

    const response = await callRefund({ purchaseId: 'p1', reason: 'This skill doesnt work at all' });
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('15 jours');
  });
});
