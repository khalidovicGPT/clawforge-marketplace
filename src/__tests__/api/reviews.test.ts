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

describe('POST /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com' } },
      error: null,
    });
  });

  async function callReview(body: unknown) {
    const { POST } = await import('@/app/api/reviews/route');
    const request = new Request('http://localhost:3000/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return POST(request as unknown as import('next/server').NextRequest);
  }

  it('retourne 401 si non authentifie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await callReview({ skill_id: 's1', rating: 5 });
    expect(response.status).toBe(401);
  });

  it('retourne 400 si skill_id manquant', async () => {
    const response = await callReview({ rating: 5 });
    expect(response.status).toBe(400);
  });

  it('retourne 400 si rating manquant', async () => {
    const response = await callReview({ skill_id: 's1' });
    expect(response.status).toBe(400);
  });

  it('retourne 400 si rating hors limites', async () => {
    let response = await callReview({ skill_id: 's1', rating: 0 });
    expect(response.status).toBe(400);

    response = await callReview({ skill_id: 's1', rating: 6 });
    expect(response.status).toBe(400);
  });

  it('retourne 403 si pas d achat', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockServiceFrom.mockReturnValue(chainable);

    const response = await callReview({ skill_id: 's1', rating: 4 });
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toContain('acheté');
  });

  it('cree une review si achat valide', async () => {
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'r1', rating: 4, comment: null },
          error: null,
        }),
      }),
    });

    // Premier appel from('purchases') → retourne achat
    // Deuxieme appel from('reviews') → upsert
    // Troisieme appel from('reviews') → select all ratings
    // Quatrieme appel from('skills') → update rating_avg
    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === 'purchases') {
        const c: Record<string, unknown> = {};
        c.select = vi.fn().mockReturnValue(c);
        c.eq = vi.fn().mockReturnValue(c);
        c.single = vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null });
        return c;
      }
      if (table === 'reviews' && callCount <= 3) {
        if (callCount === 2) {
          return { upsert: mockUpsert };
        }
        // allReviews
        const c: Record<string, unknown> = {};
        c.select = vi.fn().mockReturnValue(c);
        c.eq = vi.fn().mockReturnValue(c);
        c.then = (resolve: (v: unknown) => void) => resolve({
          data: [{ rating: 4 }, { rating: 5 }],
          error: null,
        });
        return c;
      }
      if (table === 'skills') {
        const c: Record<string, unknown> = {};
        c.update = vi.fn().mockReturnValue(c);
        c.eq = vi.fn().mockReturnValue(c);
        c.then = (resolve: (v: unknown) => void) => resolve({ error: null });
        return c;
      }
      return {};
    });

    const response = await callReview({ skill_id: 's1', rating: 4, comment: 'Super' });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.review).toBeDefined();
  });
});
