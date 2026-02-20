'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Search, User, LogOut, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🦾</span>
            <span className="text-xl font-bold text-gray-900">ClawForge</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-8">
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Accueil
          </Link>
          <Link
            href="/skills"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Catalogue
          </Link>
          <Link
            href="/creators"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Créateurs
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            L'équipe
          </Link>
          <Link
            href="/charte-ia"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <BookOpen className="h-4 w-4" />
            Charte IA
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Tableau de bord
            </Link>
          )}
        </div>

        {/* Search & Auth */}
        <div className="hidden md:flex md:items-center md:gap-4">
          <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <Search className="h-5 w-5" />
          </button>
          
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-200" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  {user.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Avatar" 
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <span className="max-w-[120px] truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Connexion
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-2 text-gray-700"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-4">
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              Accueil
            </Link>
            <Link
              href="/skills"
              className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              Catalogue
            </Link>
            <Link
              href="/creators"
              className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              Créateurs
            </Link>
            <Link
              href="/about"
              className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              L'équipe
            </Link>
            <Link
              href="/charte-ia"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              <BookOpen className="h-4 w-4" />
              Charte IA
            </Link>
            <hr className="my-2" />
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  Tableau de bord
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full rounded-lg px-3 py-2 text-left text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  Connexion
                </Link>
                <Link
                  href="/login"
                  className="block rounded-lg bg-gray-900 px-3 py-2 text-center text-base font-medium text-white"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
