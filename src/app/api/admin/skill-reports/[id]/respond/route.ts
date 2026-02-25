import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendReportResolutionEmail } from '@/lib/report-emails';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/skill-reports/[id]/respond
 * Repondre a un signalement (admin uniquement).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    const serviceClient = createServiceClient();
    const body = await request.json();
    const { status, admin_notes, resolution_action, notify_user } = body;

    // Validation
    const validStatuses = ['open', 'under_review', 'resolved', 'rejected', 'escalated'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    if (!admin_notes || typeof admin_notes !== 'string' || admin_notes.trim().length === 0) {
      return NextResponse.json({ error: 'Les notes admin sont obligatoires' }, { status: 400 });
    }

    // Recuperer le signalement
    const { data: report, error: fetchError } = await serviceClient
      .from('skill_reports')
      .select(`
        *,
        skill:skills!skill_reports_skill_id_fkey(id, title, status, certification),
        reporter:users!skill_reports_reported_by_fkey(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !report) {
      return NextResponse.json({ error: 'Signalement non trouve' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const isResolved = status === 'resolved' || status === 'rejected';

    // Mettre a jour le signalement
    const updateData: Record<string, unknown> = {
      status,
      admin_notes: admin_notes.trim(),
      updated_at: now,
    };

    if (resolution_action) {
      updateData.resolution_action = resolution_action;
    }

    if (isResolved) {
      updateData.resolved_by = user.id;
      updateData.resolved_at = now;
    }

    const { error: updateError } = await serviceClient
      .from('skill_reports')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Si resolution_action = skill_approved, approuver le skill
    if (resolution_action === 'skill_approved' && report.skill) {
      await serviceClient
        .from('skills')
        .update({
          status: 'published',
          is_visible: true,
          updated_at: now,
        })
        .eq('id', report.skill.id);
    }

    // Email au createur si demande
    if (notify_user !== false && report.reporter?.email) {
      try {
        await sendReportResolutionEmail(
          report.reporter.email,
          report.reporter.name || 'Createur',
          report.skill?.title || 'Skill',
          admin_notes.trim(),
          resolution_action || null,
        );
      } catch (emailError) {
        console.error('Erreur email resolution signalement:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reponse enregistree',
    });
  } catch (error) {
    console.error('Admin respond error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
