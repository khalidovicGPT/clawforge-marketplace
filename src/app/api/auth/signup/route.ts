import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authLimiter, checkRateLimit } from '@/lib/rate-limit';
import { generateVerificationToken } from '@/lib/verification-token';
import { sendEmail, buildVerificationEmail } from '@/lib/n8n';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createServiceClient();
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

    // Create user in Supabase Auth (email NOT confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        display_name: name,
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);

      // If user already exists, check if they are unverified and resend
      if (authError.message.includes('already registered')) {
        return await handleExistingUnverified(supabaseAdmin, email, name);
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
        name: name,
        role: 'user',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Generate verification token and send email
    await sendVerificationToUser(authData.user.id, email, name);

    return NextResponse.json({
      success: true,
      message: 'Un email de vérification a été envoyé. Vérifiez votre boîte de réception.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

/**
 * Send a verification email to a user.
 */
async function sendVerificationToUser(userId: string, email: string, name: string) {
  const token = generateVerificationToken(userId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clawforge.io';
  const verificationLink = `${appUrl}/api/auth/verify-email?token=${token}`;

  try {
    await sendEmail(
      email,
      'Activez votre compte ClawForge',
      buildVerificationEmail(name, verificationLink),
    );
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    // User is created — they can request a resend later
  }
}

/**
 * Handle the case where a user tries to register with an email that already exists.
 * If the account is unverified, resend the verification email.
 */
async function handleExistingUnverified(supabaseAdmin: ReturnType<typeof createServiceClient>, email: string, name: string) {
  try {
    // Look up user from our profiles table (efficient)
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('email', email)
      .single();

    if (profile) {
      // Check auth status
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);

      if (userData?.user && !userData.user.email_confirmed_at) {
        // Account exists but NOT verified — resend the verification email
        await sendVerificationToUser(profile.id, email, profile.name || name);

        return NextResponse.json({
          success: true,
          message: 'Un email de vérification a été renvoyé. Vérifiez votre boîte de réception.',
        });
      }
    }
  } catch (e) {
    console.error('Error handling existing unverified user:', e);
  }

  // Account exists and IS verified — normal "already used" error
  return NextResponse.json(
    { error: 'Cet email est déjà utilisé' },
    { status: 400 },
  );
}
