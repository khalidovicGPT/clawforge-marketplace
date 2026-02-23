import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ensureUserProfile } from '@/lib/ensure-profile';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
  action: z.enum(['change_role', 'block', 'unblock']),
  role: z.enum(['user', 'creator', 'admin']).optional(),
});

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non authentifie', status: 401, user: null, profile: null };
  const profile = await ensureUserProfile(supabase, user);
  if (profile.role !== 'admin') return { error: 'Acces interdit', status: 403, user: null, profile: null };
  return { error: null, status: 0, user, profile };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const auth = await checkAdmin(supabase);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Empecher la modification de son propre compte
    if (auth.user!.id === targetUserId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas modifier votre propre compte depuis cette interface' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Donnees invalides', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { action, role } = parsed.data;
    const serviceClient = createServiceClient();

    // Verifier que l'utilisateur cible existe
    const { data: targetUser, error: fetchError } = await serviceClient
      .from('users')
      .select('id, email, role, name')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    switch (action) {
      case 'change_role': {
        if (!role) {
          return NextResponse.json({ error: 'Le role est requis' }, { status: 400 });
        }

        const { error: updateError } = await serviceClient
          .from('users')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('id', targetUserId);

        if (updateError) {
          console.error('Role update error:', updateError);
          return NextResponse.json(
            { error: 'Erreur lors de la mise a jour du role', details: updateError.message },
            { status: 500 }
          );
        }

        console.log(`[ADMIN] ${auth.user!.email} changed role of ${targetUser.email} from ${targetUser.role} to ${role}`);

        return NextResponse.json({
          success: true,
          message: `Role de ${targetUser.name || targetUser.email} mis a jour vers "${role}"`,
        });
      }

      case 'block': {
        // Bloquer via Supabase Auth (ban)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
          body: JSON.stringify({ ban_duration: '876000h' }), // ~100 ans
        });

        if (!response.ok) {
          const err = await response.text();
          console.error('Block user error:', err);
          return NextResponse.json(
            { error: 'Erreur lors du blocage', details: err },
            { status: 500 }
          );
        }

        console.log(`[ADMIN] ${auth.user!.email} blocked user ${targetUser.email}`);

        return NextResponse.json({
          success: true,
          message: `${targetUser.name || targetUser.email} a ete bloque`,
        });
      }

      case 'unblock': {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
          body: JSON.stringify({ ban_duration: 'none' }),
        });

        if (!response.ok) {
          const err = await response.text();
          console.error('Unblock user error:', err);
          return NextResponse.json(
            { error: 'Erreur lors du deblocage', details: err },
            { status: 500 }
          );
        }

        console.log(`[ADMIN] ${auth.user!.email} unblocked user ${targetUser.email}`);

        return NextResponse.json({
          success: true,
          message: `${targetUser.name || targetUser.email} a ete debloque`,
        });
      }
    }
  } catch (error) {
    console.error('Admin user PATCH error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const auth = await checkAdmin(supabase);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Empecher la suppression de son propre compte
    if (auth.user!.id === targetUserId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Verifier que l'utilisateur cible existe
    const { data: targetUser, error: fetchError } = await serviceClient
      .from('users')
      .select('id, email, name, role')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Empecher la suppression d'un autre admin
    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un administrateur' },
        { status: 400 }
      );
    }

    // Supprimer via Supabase Auth (cascade supprime le profil users grace au ON DELETE CASCADE)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Delete user error:', err);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression', details: err },
        { status: 500 }
      );
    }

    console.log(`[ADMIN] ${auth.user!.email} deleted user ${targetUser.email} (${targetUserId})`);

    return NextResponse.json({
      success: true,
      message: `${targetUser.name || targetUser.email} a ete supprime`,
    });
  } catch (error) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
