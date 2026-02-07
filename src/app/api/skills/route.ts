import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Query params schema
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(12),
  category: z.string().optional(),
  certification: z.enum(['bronze', 'silver', 'gold']).optional(),
  priceType: z.enum(['free', 'one_time']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['newest', 'popular', 'rating', 'price_asc', 'price_desc']).default('newest'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query params
    const params = querySchema.parse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      category: searchParams.get('category'),
      certification: searchParams.get('certification'),
      priceType: searchParams.get('priceType'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
    });

    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('skills')
      .select(`
        *,
        creator:users!creator_id(id, display_name, avatar_url)
      `, { count: 'exact' })
      .eq('status', 'published');

    // Apply filters
    if (params.category) {
      query = query.eq('category', params.category);
    }
    
    if (params.certification) {
      query = query.eq('certification', params.certification);
    }
    
    if (params.priceType) {
      query = query.eq('price_type', params.priceType);
    }
    
    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,description_short.ilike.%${params.search}%`);
    }

    // Apply sorting
    switch (params.sortBy) {
      case 'popular':
        query = query.order('downloads_count', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating_avg', { ascending: false, nullsFirst: false });
        break;
      case 'price_asc':
        query = query.order('price', { ascending: true, nullsFirst: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('published_at', { ascending: false });
        break;
    }

    // Apply pagination
    const from = (params.page - 1) * params.pageSize;
    const to = from + params.pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching skills:', error);
      return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      count: count ?? 0,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil((count ?? 0) / params.pageSize),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
