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

// Mock supabase-js pour le admin client
const mockAdminUpdate = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      update: mockAdminUpdate,
    }),
  })),
}));

describe('POST /api/user/become-creator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  });

  async function callBecomeCreator() {
    const { POST } = await import('@/app/api/user/become-creator/route');
    const request = new Request('http://localhost:3000/api/user/become-creator', {
      method: 'POST',
    });
    return POST();
  }

  it('retourne 401 si non authentifie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await callBecomeCreator();
    expect(response.status).toBe(401);
  });

  it('retourne succes si deja createur', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockUserFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'creator' },
            error: null,
          }),
        }),
      }),
    });

    const response = await callBecomeCreator();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.already).toBe(true);
  });

  it('retourne succes si deja admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockUserFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        }),
      }),
    });

    const response = await callBecomeCreator();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.already).toBe(true);
  });

  it('promeut un utilisateur en createur', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockUserFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'user' },
            error: null,
          }),
        }),
      }),
    });
    mockAdminUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const response = await callBecomeCreator();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });
});
