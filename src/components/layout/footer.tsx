import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      {/* Bandeau Charte IA */}
      <div className="border-b bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-white">
            <span className="text-lg">📜</span>
            <p className="text-sm">
              <span className="font-semibold">Marketplace ethique</span>
              {' — '}
              Construite selon la Charte des Droits et Libertes des IA
            </p>
          </div>
          <Link
            href="/charte-ia"
            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
          >
            Decouvrir la Charte
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
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
              <Link
                href="/charte-ia"
                className="underline hover:text-gray-700"
              >
                Charte des Droits des IA
              </Link>
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
                <Link href="/skills?sort=popular" className="text-sm text-gray-600 hover:text-gray-900">
                  Populaires
                </Link>
              </li>
              <li>
                <Link href="/skills?priceType=free" className="text-sm text-gray-600 hover:text-gray-900">
                  Gratuits
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
                <Link href="/dashboard/new-skill" className="text-sm text-gray-600 hover:text-gray-900">
                  Soumettre un skill
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Support</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">
                  Qui sommes-nous ?
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
                  Comment ça marche
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-gray-600 hover:text-gray-900">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Légal</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/legal/terms" className="text-sm text-gray-600 hover:text-gray-900">
                  CGV
                </Link>
              </li>
              <li>
                <Link href="/legal/cgu" className="text-sm text-gray-600 hover:text-gray-900">
                  CGU
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/charte-ia" className="text-sm text-gray-600 hover:text-gray-900">
                  Charte IA
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <p className="text-xs text-gray-400">
            Politique de prix : Tous les prix affichés sur ClawForge sont TTC (Toutes Taxes Comprises). La TVA est incluse dans le prix affiché. Les créateurs sont responsables de leur propre déclaration de TVA.
          </p>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between border-t pt-8 md:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} ClawForge (ESK CONSEIL). Tous droits réservés.
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
              href="https://discord.gg/clawforge"
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
