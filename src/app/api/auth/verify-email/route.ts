import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyVerificationToken } from '@/lib/verification-token';

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
 * GET /api/auth/verify-email?token=...
 *
 * Verifies the signed token, confirms the user's email in Supabase,
 * and redirects to the login page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const origin = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(
      `${origin}/auth/verify-email?error=missing-token`,
    );
  }

  const userId = verifyVerificationToken(token);

  if (!userId) {
    return NextResponse.redirect(
      `${origin}/auth/verify-email?error=invalid-token`,
    );
  }

  // Confirm the email in Supabase
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(
      `${origin}/auth/verify-email?error=server`,
    );
  }

  // Redirect to login with success message
  return NextResponse.redirect(
    `${origin}/login?verified=true`,
  );
}
