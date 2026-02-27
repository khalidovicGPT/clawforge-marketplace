import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase service
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('generateDownloadToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('genere un token avec le prefixe dl_', async () => {
    const mockInsert = vi.fn().mockReturnValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { generateDownloadToken } = await import('@/lib/download-tokens');
    const { token, expiresAt } = await generateDownloadToken('user-1', 'skill-1');

    expect(token).toMatch(/^dl_/);
    expect(token.length).toBeGreaterThan(10);
    expect(expiresAt).toBeTruthy();
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('insere en base avec les bons parametres', async () => {
    const mockInsert = vi.fn().mockReturnValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { generateDownloadToken } = await import('@/lib/download-tokens');
    await generateDownloadToken('user-1', 'skill-1');

    expect(mockFrom).toHaveBeenCalledWith('skill_download_tokens');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        skill_id: 'skill-1',
        max_uses: 5,
      })
    );
  });

  it('throw si erreur d insertion', async () => {
    const mockInsert = vi.fn().mockReturnValue({ error: { message: 'DB error' } });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { generateDownloadToken } = await import('@/lib/download-tokens');
    await expect(generateDownloadToken('user-1', 'skill-1')).rejects.toThrow('Erreur creation token');
  });

  it('expire dans 7 jours', async () => {
    const mockInsert = vi.fn().mockReturnValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { generateDownloadToken } = await import('@/lib/download-tokens');
    const { expiresAt } = await generateDownloadToken('user-1', 'skill-1');

    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });
});

describe('verifyAndConsumeDownloadToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne null pour un token sans prefixe dl_', async () => {
    const { verifyAndConsumeDownloadToken } = await import('@/lib/download-tokens');
    const result = await verifyAndConsumeDownloadToken('invalid_token');
    expect(result).toBeNull();
  });

  it('retourne null si token non trouve en base', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockReturnValue(chainable);

    const { verifyAndConsumeDownloadToken } = await import('@/lib/download-tokens');
    const result = await verifyAndConsumeDownloadToken('dl_testtoken123');
    expect(result).toBeNull();
  });

  it('retourne null si token expire', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({
      data: {
        id: 't1', user_id: 'u1', skill_id: 's1',
        used_count: 0, max_uses: 5,
        expires_at: pastDate.toISOString(),
      },
      error: null,
    });
    mockFrom.mockReturnValue(chainable);

    const { verifyAndConsumeDownloadToken } = await import('@/lib/download-tokens');
    const result = await verifyAndConsumeDownloadToken('dl_testtoken123');
    expect(result).toBeNull();
  });

  it('retourne null si max uses atteint', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({
      data: {
        id: 't1', user_id: 'u1', skill_id: 's1',
        used_count: 5, max_uses: 5,
        expires_at: futureDate.toISOString(),
      },
      error: null,
    });
    mockFrom.mockReturnValue(chainable);

    const { verifyAndConsumeDownloadToken } = await import('@/lib/download-tokens');
    const result = await verifyAndConsumeDownloadToken('dl_testtoken123');
    expect(result).toBeNull();
  });
});
