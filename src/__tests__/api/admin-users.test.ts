import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase server
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Mock ensure-profile
const mockEnsureProfile = vi.fn();
vi.mock('@/lib/ensure-profile', () => ({
  ensureUserProfile: (...args: unknown[]) => mockEnsureProfile(...args),
}));

// Mock supabase service
const mockServiceFrom = vi.fn();
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function callAdminUsers(params: Record<string, string> = {}) {
    const { GET } = await import('@/app/api/admin/users/route');
    const searchParams = new URLSearchParams(params);
    const url = `http://localhost:3000/api/admin/users?${searchParams}`;
    const request = new Request(url);
    return GET(request as unknown as import('next/server').NextRequest);
  }

  it('retourne 401 si non authentifie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await callAdminUsers();
    expect(response.status).toBe(401);
  });

  it('retourne 403 si non admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@test.com' } },
      error: null,
    });
    mockEnsureProfile.mockResolvedValue({ role: 'user' });
    const response = await callAdminUsers();
    expect(response.status).toBe(403);
  });

  it('retourne 403 pour un createur', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'creator-1', email: 'creator@test.com' } },
      error: null,
    });
    mockEnsureProfile.mockResolvedValue({ role: 'creator' });
    const response = await callAdminUsers();
    expect(response.status).toBe(403);
  });

  it('accepte un admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      error: null,
    });
    mockEnsureProfile.mockResolvedValue({ role: 'admin' });

    // Mock le query builder pour service client
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => resolve({
        data: [{ id: 'u1', email: 'a@test.com', name: 'A', role: 'user', created_at: '2026-01-01' }],
        error: null,
        count: 1,
      }),
    };
    mockServiceFrom.mockReturnValue(mockQuery);

    const response = await callAdminUsers();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.users).toBeDefined();
    expect(json.total).toBeDefined();
  });

  it('sanitise le parametre search', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      error: null,
    });
    mockEnsureProfile.mockResolvedValue({ role: 'admin' });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null, count: 0 }),
    };
    mockServiceFrom.mockReturnValue(mockQuery);

    await callAdminUsers({ search: 'test,injection(evil)' });

    // Verifier que or() a ete appele avec la valeur sanitisee
    // La virgule entre les deux clauses ilike est normale (separateur PostgREST)
    // mais l'input 'test,injection(evil)' doit devenir 'testinjectionevil'
    expect(mockQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('testinjectionevil')
    );
    // Verifier que les parentheses de l'input ont ete supprimees
    const calledArg = mockQuery.or.mock.calls[0][0] as string;
    expect(calledArg).not.toContain('(evil)');
    expect(calledArg).not.toContain('injection(');
  });
});
