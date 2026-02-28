'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Search, User, LogOut, BookOpen, Shield } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export function Header() {
  const t = useTranslations('Header');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user) {
        supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setIsAdmin(data?.role === 'admin');
          });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setIsAdmin(data?.role === 'admin');
          });
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const locale = useLocale();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = locale === 'fr' ? '/' : `/${locale}/`;
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
            {t('home')}
          </Link>
          <Link
            href="/skills"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {t('catalog')}
          </Link>
          <Link
            href="/creators"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {t('creators')}
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {t('team')}
          </Link>
          <Link
            href="/charte-ia"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <BookOpen className="h-4 w-4" />
            {t('charteIA')}
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {t('dashboard')}
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <Shield className="h-4 w-4" />
              {t('admin')}
            </Link>
          )}
        </div>

        {/* Search & Auth */}
        <div className="hidden md:flex md:items-center md:gap-4">
          <LanguageSwitcher />
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
                title={t('logout')}
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
                {t('login')}
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                {t('register')}
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
              {t('home')}
            </Link>
            <Link
              href="/skills"
              className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('catalog')}
            </Link>
            <Link
              href="/creators"
              className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('creators')}
            </Link>
            <Link
              href="/about"
              className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('team')}
            </Link>
            <Link
              href="/charte-ia"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              <BookOpen className="h-4 w-4" />
              {t('charteIA')}
            </Link>
            <div className="px-3 py-2">
              <LanguageSwitcher />
            </div>
            <hr className="my-2" />
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  {t('dashboard')}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <Shield className="h-4 w-4" />
                    {t('administration')}
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="block w-full rounded-lg px-3 py-2 text-left text-base font-medium text-red-600 hover:bg-red-50"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  {t('login')}
                </Link>
                <Link
                  href="/login"
                  className="block rounded-lg bg-gray-900 px-3 py-2 text-center text-base font-medium text-white"
                >
                  {t('register')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
