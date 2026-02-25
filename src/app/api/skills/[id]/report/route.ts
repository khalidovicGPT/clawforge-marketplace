import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  sendReportConfirmationEmail,
  sendReportAdminNotificationEmail,
} from '@/lib/report-emails';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/skills/[id]/report
 * Creer un signalement pour un skill (createur uniquement).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verifier que le skill existe et appartient au createur
    const { data: skill, error: fetchError } = await serviceClient
      .from('skills')
      .select('id, title, version, status, creator_id')
      .eq('id', id)
      .single();

    if (fetchError || !skill) {
      return NextResponse.json({ error: 'Skill non trouve' }, { status: 404 });
    }

    if (skill.creator_id !== user.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const body = await request.json();
    const { report_type, description, attachment_url } = body;

    // Validation
    const validTypes = ['false_positive', 'system_bug', 'unclear_error', 'other'];
    if (!report_type || !validTypes.includes(report_type)) {
      return NextResponse.json({ error: 'Type de probleme invalide' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 50) {
      return NextResponse.json(
        { error: 'La description doit contenir au moins 50 caracteres' },
        { status: 400 },
      );
    }

    // Verifier qu'il n'y a pas deja un signalement ouvert pour ce skill
    const { data: existingOpen } = await serviceClient
      .from('skill_reports')
      .select('id')
      .eq('skill_id', id)
      .eq('reported_by', user.id)
      .in('status', ['open', 'under_review'])
      .limit(1);

    if (existingOpen && existingOpen.length > 0) {
      return NextResponse.json(
        { error: 'Vous avez deja un signalement en cours pour ce skill' },
        { status: 409 },
      );
    }

    // Calculer la priorite automatique
    let priority = 'normal';
    if (report_type === 'system_bug') {
      priority = 'high';
    } else if (report_type === 'other') {
      priority = 'low';
    }

    // Verifier si plusieurs signalements existent (tous statuts confondus)
    const { count: reportCount } = await serviceClient
      .from('skill_reports')
      .select('id', { count: 'exact', head: true })
      .eq('skill_id', id);

    if (reportCount && reportCount >= 2) {
      priority = 'high';
    }

    // Creer le signalement
    const { data: report, error: insertError } = await serviceClient
      .from('skill_reports')
      .insert({
        skill_id: id,
        reported_by: user.id,
        report_type,
        description: description.trim(),
        attachment_url: attachment_url || null,
        priority,
      })
      .select('id')
      .single();

    if (insertError || !report) {
      return NextResponse.json({ error: insertError?.message || 'Erreur creation' }, { status: 500 });
    }

    // Emails (best-effort, ne bloque pas la reponse)
    const { data: creatorProfile } = await serviceClient
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single();

    try {
      if (creatorProfile?.email) {
        await sendReportConfirmationEmail(
          creatorProfile.email,
          creatorProfile.name || 'Createur',
          skill.title,
          report_type,
          report.id,
        );
      }
    } catch (e) {
      console.error('Erreur email confirmation signalement:', e);
    }

    try {
      await sendReportAdminNotificationEmail(
        skill.title,
        skill.version || '1.0.0',
        creatorProfile?.email || user.email || '',
        report_type,
        priority,
        description.trim(),
        report.id,
      );
    } catch (e) {
      console.error('Erreur email notification admin:', e);
    }

    return NextResponse.json({
      success: true,
      report_id: report.id,
      message: 'Signalement envoye. Notre equipe vous repondra sous 24h.',
    });
  } catch (error) {
    console.error('Report creation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * GET /api/skills/[id]/report
 * Lister les signalements du createur pour ce skill.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verifier propriete du skill
    const { data: skill } = await serviceClient
      .from('skills')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (!skill || skill.creator_id !== user.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { data: reports, error } = await serviceClient
      .from('skill_reports')
      .select('*')
      .eq('skill_id', id)
      .eq('reported_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error('Report list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
