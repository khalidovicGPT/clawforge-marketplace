import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authLimiter, checkRateLimit } from '@/lib/rate-limit';
import { generateVerificationToken } from '@/lib/verification-token';
import { sendEmail, buildVerificationEmail } from '@/lib/n8n';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * POST /api/auth/resend-verification
 * Body: { email: string }
 *
 * Re-sends the verification email for an unconfirmed account.
 * Always returns 200 to avoid revealing whether the email exists.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (stricter: 3 per 60s)
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const rateLimitResponse = await checkRateLimit(authLimiter, `resend:${ip}`);
    if (rateLimitResponse) return rateLimitResponse;

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 },
      );
    }

    // Look up user – always return success to avoid user enumeration
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('email', email)
      .single();

    if (profile) {
      // Check if user is already confirmed
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
        profile.id,
      );

      if (userData?.user && !userData.user.email_confirmed_at) {
        const token = generateVerificationToken(profile.id);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const link = `${appUrl}/api/auth/verify-email?token=${token}`;

        try {
          await sendEmail(
            email,
            'Activez votre compte ClawForge',
            buildVerificationEmail(profile.name || email.split('@')[0], link),
          );
        } catch (e) {
          console.error('Resend verification email error:', e);
        }
      }
    }

    // Always succeed
    return NextResponse.json({
      success: true,
      message: 'Si un compte existe avec cet email, un lien de vérification a été envoyé.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
