import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAgentKey } from '@/lib/agent-api-keys';
import { createClient } from '@/lib/supabase/server';
import JSZip from 'jszip';

const TEXT_EXTENSIONS = [
  '.py', '.js', '.ts', '.sh', '.bash', '.yaml', '.yml', '.json',
  '.md', '.txt', '.cfg', '.ini', '.toml', '.env.example', '.html', '.css',
];

const MAX_FILE_SIZE = 100_000; // 100 Ko par fichier

/**
 * GET /api/skills/[id]/source-code
 *
 * Retourne le contenu du code source d'un skill (pour analyse par QualityClaw).
 * Accessible par les admins (session) ou les agents (cle API).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: skillId } = await params;
    let isAuthorized = false;

    // Auth
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '').trim();
      const auth = await authenticateAgentKey(apiKey);
      if (auth && (auth.creatorRole === 'admin' || auth.permissions.includes('skills:certify'))) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const serviceClient = createServiceClient();
          const { data: profile } = await serviceClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile?.role === 'admin') isAuthorized = true;
        }
      } catch {
        // Pas de session
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    // Recuperer le skill
    const supabase = createServiceClient();
    const { data: skill } = await supabase
      .from('skills')
      .select('id, title, slug, version, file_url')
      .eq('id', skillId)
      .single();

    if (!skill?.file_url) {
      return NextResponse.json({ error: 'Skill ou fichier introuvable' }, { status: 404 });
    }

    // Telecharger et decompresser le ZIP
    const response = await fetch(skill.file_url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Impossible de telecharger le ZIP' }, { status: 500 });
    }

    const zipBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);

    // Extraire les fichiers texte
    const files: { path: string; content: string; language: string }[] = [];
    let skillMd = '';
    let readme = '';

    for (const [path, file] of Object.entries(zip.files)) {
      if (file.dir) continue;

      const ext = '.' + path.split('.').pop()?.toLowerCase();
      const isText = TEXT_EXTENSIONS.some(e => path.toLowerCase().endsWith(e));
      if (!isText) continue;

      try {
        const content = await file.async('string');
        if (content.length > MAX_FILE_SIZE) continue;

        const language = detectLanguage(ext);
        files.push({ path, content, language });

        if (path.endsWith('SKILL.md')) skillMd = content;
        if (path.endsWith('README.md')) readme = content;
      } catch {
        // Fichier non lisible
      }
    }

    return NextResponse.json({
      skill_id: skill.id,
      name: skill.title,
      version: skill.version,
      files,
      skill_md: skillMd,
      readme,
    });
  } catch (error) {
    console.error('source-code error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

function detectLanguage(ext: string): string {
  const map: Record<string, string> = {
    '.py': 'python', '.js': 'javascript', '.ts': 'typescript',
    '.sh': 'bash', '.bash': 'bash', '.yaml': 'yaml', '.yml': 'yaml',
    '.json': 'json', '.md': 'markdown', '.txt': 'text',
    '.html': 'html', '.css': 'css', '.toml': 'toml', '.ini': 'ini',
  };
  return map[ext] || 'text';
}
