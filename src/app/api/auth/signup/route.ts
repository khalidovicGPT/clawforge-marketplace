import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authLimiter, checkRateLimit } from '@/lib/rate-limit';

// Admin client for auth operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const rateLimitResponse = await checkRateLimit(authLimiter, `signup:${ip}`);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for beta
      user_metadata: {
        display_name: name,
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    // Create user profile in database
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        display_name: name,
        role: 'user',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail - user can still log in
    }

    // Return success - user will need to sign in
    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        display_name: name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
