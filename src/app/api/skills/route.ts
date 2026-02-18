import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SKILL_CATEGORIES, type SkillCategory } from '@/types/database';
import { skillCreateLimiter, checkRateLimit } from '@/lib/rate-limit';
import { ensureUserProfile } from '@/lib/ensure-profile';

const VALID_CATEGORIES = Object.keys(SKILL_CATEGORIES) as SkillCategory[];

const VIRUSTOTAL_API_URL = 'https://www.virustotal.com/api/v3';

// Helper function to scan file with VirusTotal
async function scanWithVirusTotal(file: File): Promise<{ scanId: string }> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    throw new Error('VirusTotal API non configurée');
  }

  const vtFormData = new FormData();
  vtFormData.append('file', file);

  const response = await fetch(`${VIRUSTOTAL_API_URL}/files`, {
    method: 'POST',
    headers: {
      'x-apikey': apiKey,
    },
    body: vtFormData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur VirusTotal');
  }

  const result = await response.json();
  return { scanId: result.data.id };
}

// Helper function to check scan status
async function getScanStatus(scanId: string): Promise<{ status: 'clean' | 'suspicious' | 'malicious' | 'pending' }> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    throw new Error('VirusTotal API non configurée');
  }

  const response = await fetch(`${VIRUSTOTAL_API_URL}/analyses/${scanId}`, {
    headers: {
      'x-apikey': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la vérification du scan');
  }

  const result = await response.json();
  const attributes = result.data?.attributes;
  
  if (!attributes) {
    throw new Error('Réponse VirusTotal invalide');
  }

  const scanStatus = attributes.status;
  const stats = attributes.stats || {};

  if (scanStatus === 'queued' || scanStatus === 'in-progress') {
    return { status: 'pending' };
  } else if (stats.malicious > 0) {
    return { status: 'malicious' };
  } else if (stats.suspicious > 0) {
    return { status: 'suspicious' };
  } else {
    return { status: 'clean' };
  }
}

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
      .eq('status', 'published');

    // Apply filters
    if (params.category) {
      query = query.eq('category', params.category);
    }
    
    if (params.certification) {
      query = query.eq('certification', params.certification);
    }
    
    if (params.priceType === 'free') {
      query = query.eq('price', 0);
    } else if (params.priceType === 'one_time') {
      query = query.gt('price', 0);
    }
    
    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,description_short.ilike.%${params.search}%`);
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

// POST - Create new skill with VirusTotal scan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Check if user is a creator
    const profile = await ensureUserProfile(supabase, user);

    if (profile.role !== 'creator' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Vous devez être créateur pour soumettre un skill' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const price = parseInt(formData.get('price') as string) || 0;
    const tagsRaw = formData.get('tags') as string | null;
    const tags = tagsRaw ? JSON.parse(tagsRaw) as string[] : null;

    if (!file || !name || !description || !category) {
      return NextResponse.json(
        { error: 'Champs manquants' },
        { status: 400 }
      );
    }

    // Validate category against allowed values
    if (!VALID_CATEGORIES.includes(category as SkillCategory)) {
      return NextResponse.json(
        { error: `Catégorie invalide. Valeurs acceptées : ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Step 1: Scan with VirusTotal
    console.log('Starting VirusTotal scan...');
    let scanResult;
    try {
      scanResult = await scanWithVirusTotal(file);
    } catch (error) {
      console.error('VirusTotal scan failed:', error);
      return NextResponse.json(
        { error: 'Échec du scan antivirus' },
        { status: 502 }
      );
    }

    // Step 2: Wait a moment and check initial status (VirusTotal is often fast for known files)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let scanStatus;
    try {
      scanStatus = await getScanStatus(scanResult.scanId);
    } catch (error) {
      console.error('Could not get scan status:', error);
      // Continue anyway, we'll mark it for manual review
      scanStatus = { status: 'pending' };
    }

    // Step 3: Reject if malicious
    if (scanStatus.status === 'malicious') {
      return NextResponse.json(
        { 
          error: 'Fichier rejeté', 
          reason: 'Le fichier a été détecté comme malveillant par notre système de sécurité',
          scanId: scanResult.scanId 
        },
        { status: 400 }
      );
    }

    // Step 4: Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `skills/${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('skills')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload du fichier' },
        { status: 500 }
      );
    }

    // Step 5: Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('skills')
      .getPublicUrl(filePath);

    // Step 6: Create skill record
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .insert({
        creator_id: user.id,
        name: name,
        title: name,
        slug: `${slug}-${Date.now().toString(36)}`,
        description_short: description,
        category,
        price,
        file_url: publicUrl,
        status: 'pending',
        certification: 'none',
        version: '1.0.0',
        tags,
      })
      .select()
      .single();

    if (skillError) {
      console.error('Skill creation error:', skillError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du skill' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      skill,
      scanStatus: scanStatus.status,
      message: scanStatus.status === 'clean' 
        ? 'Skill soumis avec succès et en attente de certification'
        : 'Skill soumis, scan de sécurité en cours',
    });
  } catch (error) {
    console.error('Create skill error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
