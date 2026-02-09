import { NextRequest, NextResponse } from 'next/server';

const VIRUSTOTAL_API_URL = 'https://www.virustotal.com/api/v3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scanId');

    if (!scanId) {
      return NextResponse.json(
        { error: 'scanId manquant' },
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

    // Get analysis status from VirusTotal
    const response = await fetch(`${VIRUSTOTAL_API_URL}/analyses/${scanId}`, {
      headers: {
        'x-apikey': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('VirusTotal status error:', errorData);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification du statut' },
        { status: 502 }
      );
    }

    const result = await response.json();
    const attributes = result.data?.attributes;
    
    if (!attributes) {
      return NextResponse.json(
        { error: 'Réponse VirusTotal invalide' },
        { status: 502 }
      );
    }

    const status = attributes.status;
    const stats = attributes.stats || {};

    // Determine result
    let resultStatus: 'pending' | 'clean' | 'suspicious' | 'malicious';
    
    if (status === 'queued' || status === 'in-progress') {
      resultStatus = 'pending';
    } else if (stats.malicious > 0) {
      resultStatus = 'malicious';
    } else if (stats.suspicious > 0) {
      resultStatus = 'suspicious';
    } else {
      resultStatus = 'clean';
    }

    return NextResponse.json({
      success: true,
      status: resultStatus,
      scanId,
      stats: {
        malicious: stats.malicious || 0,
        suspicious: stats.suspicious || 0,
        harmless: stats.harmless || 0,
        undetected: stats.undetected || 0,
      },
      totalEngines: (stats.malicious || 0) + (stats.suspicious || 0) + (stats.harmless || 0) + (stats.undetected || 0),
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}
