import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase server client
const mockExchangeCode = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCode,
    },
  }),
}));

describe('GET /api/auth/callback — open redirect protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExchangeCode.mockResolvedValue({ error: null });
  });

  async function callCallback(next: string, code = 'valid-code') {
    const { GET } = await import('@/app/api/auth/callback/route');
    const url = `http://localhost:3000/api/auth/callback?code=${code}&next=${encodeURIComponent(next)}`;
    const request = new Request(url);
    const response = await GET(request);
    return response;
  }

  it('redirige vers un chemin local valide', async () => {
    const response = await callCallback('/dashboard');
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/dashboard');
  });

  it('bloque //evil.com (protocol-relative)', async () => {
    const response = await callCallback('//evil.com');
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/');
  });

  it('bloque /\\@evil.com', async () => {
    const response = await callCallback('/@evil.com');
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/');
  });

  it('bloque une URL absolue dans next', async () => {
    const response = await callCallback('https://evil.com');
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    // https:// ne commence pas par /, donc => '/'
    expect(location).toBe('http://localhost:3000/');
  });

  it('redirige vers / par defaut si next est vide', async () => {
    const { GET } = await import('@/app/api/auth/callback/route');
    const url = 'http://localhost:3000/api/auth/callback?code=valid-code';
    const response = await GET(new Request(url));
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/');
  });

  it('redirige vers erreur si pas de code', async () => {
    const { GET } = await import('@/app/api/auth/callback/route');
    const url = 'http://localhost:3000/api/auth/callback';
    const response = await GET(new Request(url));
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('auth-code-error');
  });

  it('redirige vers erreur si exchange echoue', async () => {
    mockExchangeCode.mockResolvedValue({ error: { message: 'Invalid code' } });
    const { GET } = await import('@/app/api/auth/callback/route');
    const url = 'http://localhost:3000/api/auth/callback?code=bad-code';
    const response = await GET(new Request(url));
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('auth-code-error');
  });
});
