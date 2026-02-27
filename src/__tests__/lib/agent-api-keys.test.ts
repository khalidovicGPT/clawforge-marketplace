import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase service client
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('generateApiKey', () => {
  it('genere une cle avec le bon prefixe', async () => {
    const { generateApiKey } = await import('@/lib/agent-api-keys');
    const { plainKey, hash } = await generateApiKey();
    expect(plainKey).toMatch(/^clf_sk_live_/);
    expect(plainKey.length).toBeGreaterThan(12);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(plainKey); // Le hash ne doit pas etre la cle
  });

  it('genere des cles uniques', async () => {
    const { generateApiKey } = await import('@/lib/agent-api-keys');
    const key1 = await generateApiKey();
    const key2 = await generateApiKey();
    expect(key1.plainKey).not.toBe(key2.plainKey);
    expect(key1.hash).not.toBe(key2.hash);
  });
});

describe('verifyApiKey', () => {
  it('verifie une cle valide', async () => {
    const { generateApiKey, verifyApiKey } = await import('@/lib/agent-api-keys');
    const { plainKey, hash } = await generateApiKey();
    const valid = await verifyApiKey(plainKey, hash);
    expect(valid).toBe(true);
  });

  it('rejette une mauvaise cle', async () => {
    const { generateApiKey, verifyApiKey } = await import('@/lib/agent-api-keys');
    const { hash } = await generateApiKey();
    const valid = await verifyApiKey('clf_sk_live_wrongkey12345678', hash);
    expect(valid).toBe(false);
  });

  it('rejette une cle vide', async () => {
    const { generateApiKey, verifyApiKey } = await import('@/lib/agent-api-keys');
    const { hash } = await generateApiKey();
    const valid = await verifyApiKey('', hash);
    expect(valid).toBe(false);
  });
});

describe('authenticateAgentKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejette une cle sans le bon prefixe', async () => {
    const { authenticateAgentKey } = await import('@/lib/agent-api-keys');
    const result = await authenticateAgentKey('invalid_key');
    expect(result).toBeNull();
    // from() ne devrait pas etre appele
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('retourne null si aucune cle en base', async () => {
    const chainable: Record<string, unknown> = {};
    chainable.select = vi.fn().mockReturnValue(chainable);
    chainable.is = vi.fn().mockReturnValue(chainable);
    chainable.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
    mockFrom.mockReturnValue(chainable);

    const { authenticateAgentKey } = await import('@/lib/agent-api-keys');
    const result = await authenticateAgentKey('clf_sk_live_test123456789012');
    expect(result).toBeNull();
  });
});
