import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Payment Setup Reminder API
 *
 * Called by n8n/cron daily to send reminder emails to creators
 * who have skills in 'pending_payment_setup' status.
 *
 * Reminders schedule:
 * - J+1: "Votre skill a eu X vues ! Activez les ventes"
 * - J+7: "Des utilisateurs attendent d'acheter votre skill"
 * - J+30: Dernier rappel
 *
 * Auth: Requires ADMIN_SECRET_KEY header or CRON_SECRET
 *
 * Usage from n8n:
 *   POST /api/cron/payment-reminders
 *   Headers: { "x-cron-secret": "your-secret" }
 *
 * Response returns list of reminders to send so n8n can handle
 * the actual email delivery (via SMTP, Sendgrid, etc.)
 */

const REMINDER_SCHEDULE = [
  { type: 'day_1', daysAfter: 1, subject: 'Votre skill a eu des vues ! Activez les ventes', template: 'reminder_day1' },
  { type: 'day_7', daysAfter: 7, subject: 'Des utilisateurs attendent d\'acheter votre skill', template: 'reminder_day7' },
  { type: 'day_30', daysAfter: 30, subject: 'Dernier rappel : activez les ventes de votre skill', template: 'reminder_day30' },
] as const;

export async function POST(request: NextRequest) {
  try {
    // Authenticate the cron request
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.ADMIN_SECRET_KEY || process.env.CRON_SECRET;

    if (!cronSecret || cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();

    // Get all skills with pending_payment_setup status
    const { data: pendingSkills, error: skillsError } = await supabase
      .from('skills')
      .select(`
        id,
        title,
        slug,
        price,
        download_count,
        published_at,
        creator_id,
        creator:users!skills_creator_id_fkey(id, email, display_name)
      `)
      .eq('status', 'pending_payment_setup');

    if (skillsError) {
      console.error('[CRON] Error fetching pending skills:', skillsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!pendingSkills || pendingSkills.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending payment setup skills found',
        reminders: [],
      });
    }

    // Get already sent reminders
    const skillIds = pendingSkills.map(s => s.id);
    const { data: sentReminders } = await supabase
      .from('payment_setup_reminders')
      .select('skill_id, reminder_type')
      .in('skill_id', skillIds);

    const sentSet = new Set(
      (sentReminders || []).map(r => `${r.skill_id}:${r.reminder_type}`)
    );

    // Determine which reminders to send
    const remindersToSend: Array<{
      skill_id: string;
      skill_title: string;
      skill_slug: string;
      skill_views: number;
      creator_id: string;
      creator_email: string;
      creator_name: string;
      reminder_type: string;
      subject: string;
      template: string;
      days_since_publish: number;
      configure_url: string;
    }> = [];

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clawforge.io';

    for (const skill of pendingSkills) {
      const publishedAt = skill.published_at ? new Date(skill.published_at) : null;
      if (!publishedAt) continue;

      const daysSincePublish = Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
      const creatorArr = skill.creator as unknown as Array<{ id: string; email: string; display_name: string | null }> | null;
      const creator = creatorArr?.[0] ?? null;
      if (!creator?.email) continue;

      for (const schedule of REMINDER_SCHEDULE) {
        // Check if it's time to send this reminder and it hasn't been sent yet
        if (daysSincePublish >= schedule.daysAfter && !sentSet.has(`${skill.id}:${schedule.type}`)) {
          remindersToSend.push({
            skill_id: skill.id,
            skill_title: skill.title,
            skill_slug: skill.slug,
            skill_views: skill.download_count || 0,
            creator_id: creator.id,
            creator_email: creator.email,
            creator_name: creator.display_name || creator.email.split('@')[0],
            reminder_type: schedule.type,
            subject: schedule.subject,
            template: schedule.template,
            days_since_publish: daysSincePublish,
            configure_url: `${appUrl}/dashboard/seller`,
          });
        }
      }
    }

    // Record sent reminders in database
    if (remindersToSend.length > 0) {
      const reminderRecords = remindersToSend.map(r => ({
        skill_id: r.skill_id,
        creator_id: r.creator_id,
        reminder_type: r.reminder_type,
      }));

      const { error: insertError } = await supabase
        .from('payment_setup_reminders')
        .upsert(reminderRecords, { onConflict: 'skill_id,reminder_type' });

      if (insertError) {
        console.error('[CRON] Error recording reminders:', insertError);
      }
    }

    console.log(`[CRON] Payment reminders: ${remindersToSend.length} to send for ${pendingSkills.length} pending skills`);

    return NextResponse.json({
      success: true,
      total_pending_skills: pendingSkills.length,
      reminders: remindersToSend,
    });
  } catch (error) {
    console.error('[CRON] Payment reminders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET for health check
export async function GET() {
  return NextResponse.json({
    service: 'payment-reminders',
    status: 'ok',
    schedule: REMINDER_SCHEDULE.map(s => ({ type: s.type, days_after: s.daysAfter })),
  });
}
