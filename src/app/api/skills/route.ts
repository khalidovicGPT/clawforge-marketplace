import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Query params schema - handle null values from searchParams.get()
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(12),
  category: z.string().nullish().transform(v => v || undefined),
  certification: z.enum(['bronze', 'silver', 'gold']).nullish().transform(v => v || undefined),
  priceType: z.enum(['free', 'one_time']).nullish().transform(v => v || undefined),
  search: z.string().nullish().transform(v => v || undefined),
  sortBy: z.enum(['newest', 'popular', 'rating', 'price_asc', 'price_desc']).default('newest'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query params
    const params = querySchema.parse({
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 12,
      category: searchParams.get('category'),
      certification: searchParams.get('certification'),
      priceType: searchParams.get('priceType'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy') || 'newest',
    });

    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('skills')
      .select(`
        *,
        creator:users!skills_creator_id_fkey(id, name, avatar_url)
      `, { count: 'exact' })
      .eq('status', 'approved');

    // Apply filters
    if (params.category) {
      query = query.eq('category', params.category);
    }
    
    if (params.certification) {
      query = query.eq('certification_level', params.certification);
    }
    
    if (params.priceType === 'free') {
      query = query.eq('price', 0);
    } else if (params.priceType === 'one_time') {
      query = query.gt('price', 0);
    }
    
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }

    // Apply sorting
    switch (params.sortBy) {
      case 'popular':
        query = query.order('download_count', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating_avg', { ascending: false });
        break;
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const from = (params.page - 1) * params.pageSize;
    const to = from + params.pageSize - 1;
    query = query.range(from, to);

    const { data: skills, count, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      skills: skills || [],
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / params.pageSize),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    console.error('Skills API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
