import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// VirusTotal API v3 endpoints
const VIRUSTOTAL_API_URL = 'https://www.virustotal.com/api/v3';

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

    // Get file from request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      );
    }

    // Check file size (max 32MB for VirusTotal free tier)
    if (file.size > 32 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 32MB)' },
        { status: 400 }
      );
    }

    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'VirusTotal API non configurée' },
        { status: 503 }
      );
    }

    // Prepare file for VirusTotal
    const vtFormData = new FormData();
    vtFormData.append('file', file);

    // Upload to VirusTotal
    const uploadResponse = await fetch(`${VIRUSTOTAL_API_URL}/files`, {
      method: 'POST',
      headers: {
        'x-apikey': apiKey,
      },
      body: vtFormData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('VirusTotal upload error:', errorData);
      return NextResponse.json(
        { error: 'Erreur lors du scan VirusTotal' },
        { status: 502 }
      );
    }

    const uploadResult = await uploadResponse.json();
    const analysisId = uploadResult.data?.id;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Réponse VirusTotal invalide' },
        { status: 502 }
      );
    }

    // Return scan ID for status checking
    return NextResponse.json({
      success: true,
      scanId: analysisId,
      message: 'Fichier soumis pour analyse',
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du scan' },
      { status: 500 }
    );
  }
}
