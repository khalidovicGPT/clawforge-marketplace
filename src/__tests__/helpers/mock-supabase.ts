import { vi } from 'vitest';

/**
 * Cree un mock de query builder Supabase chainable.
 * Chaque methode retourne `this` pour permettre le chainage.
 * Le resultat final est configure via `mockResolvedData`.
 */
export function createMockQueryBuilder(defaultData: unknown = null, defaultError: unknown = null) {
  const result = { data: defaultData, error: defaultError, count: null as number | null };

  const builder: Record<string, unknown> = {};

  const chainMethods = [
    'from', 'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is',
    'ilike', 'or', 'not', 'order', 'range', 'limit',
    'single', 'maybeSingle',
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // `then` pour que await fonctionne
  builder.then = (resolve: (value: unknown) => void) => resolve(result);

  // Helper pour configurer le resultat
  builder._setResult = (data: unknown, error: unknown = null, count: number | null = null) => {
    result.data = data;
    result.error = error;
    result.count = count;
  };

  return builder;
}

/**
 * Cree un mock d'auth Supabase
 */
export function createMockAuth(user: { id: string; email: string } | null = null) {
  return {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: user ? null : { message: 'Not authenticated' },
    }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    admin: {
      createUser: vi.fn(),
      getUserById: vi.fn(),
      updateUserById: vi.fn(),
    },
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

/**
 * Cree un mock complet du client Supabase
 */
export function createMockSupabaseClient(user: { id: string; email: string } | null = null) {
  const queryBuilder = createMockQueryBuilder();
  const auth = createMockAuth(user);

  return {
    auth,
    from: vi.fn().mockReturnValue(queryBuilder),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.zip' } }),
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    _queryBuilder: queryBuilder,
    _auth: auth,
  };
}

/**
 * Cree un NextRequest mock
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = 'GET', body, headers = {} } = options;

  const init: RequestInit = {
    method,
    headers: new Headers({
      'content-type': 'application/json',
      ...headers,
    }),
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}

/**
 * Helper pour extraire le JSON d'une NextResponse
 */
export async function getResponseJson(response: Response) {
  return response.json();
}
