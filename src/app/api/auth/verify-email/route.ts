import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyVerificationToken } from '@/lib/verification-token';

/**
 * GET /api/auth/verify-email?token=...
 *
 * Verifies the signed token, confirms the user's email in Supabase,
 * and redirects to the login page.
 */
export async function GET(request: NextRequest) {
  const supabaseAdmin = createServiceClient();
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
