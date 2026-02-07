import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* ClawForge */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🦾</span>
              <span className="text-lg font-bold text-gray-900">ClawForge</span>
            </Link>
            <p className="mt-4 text-sm text-gray-600">
              La première marketplace de skills certifiés pour OpenClaw.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Construite selon la{' '}
              <a
                href="https://github.com/khalidessoulami/charte-droits-libertes-IA"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700"
              >
                Charte des Droits des IA
              </a>
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Marketplace</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/skills" className="text-sm text-gray-600 hover:text-gray-900">
                  Catalogue
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-sm text-gray-600 hover:text-gray-900">
                  Catégories
                </Link>
              </li>
              <li>
                <Link href="/creators" className="text-sm text-gray-600 hover:text-gray-900">
                  Créateurs
                </Link>
              </li>
            </ul>
          </div>

          {/* Créateurs */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Créateurs</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/become-creator" className="text-sm text-gray-600 hover:text-gray-900">
                  Devenir créateur
                </Link>
              </li>
              <li>
                <Link href="/docs/skill-spec" className="text-sm text-gray-600 hover:text-gray-900">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/docs/certification" className="text-sm text-gray-600 hover:text-gray-900">
                  Certification
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Légal</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-sm text-gray-600 hover:text-gray-900">
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between border-t pt-8 md:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} ClawForge. Tous droits réservés.
          </p>
          <div className="mt-4 flex items-center gap-4 md:mt-0">
            <a
              href="https://github.com/clawforge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/openclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700"
            >
              Discord
            </a>
            <a
              href="https://twitter.com/clawforge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
