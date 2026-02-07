'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Search, User } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            href="/skills"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Catalogue
          </Link>
          <div className="relative">
            <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Catégories
            </button>
          </div>
          <Link
            href="/creators"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Créateurs
          </Link>
        </div>

        {/* Search & Auth */}
        <div className="hidden md:flex md:items-center md:gap-4">
          <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <Search className="h-5 w-5" />
          </button>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            S'inscrire
          </Link>
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
            <hr className="my-2" />
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              className="block rounded-lg bg-gray-900 px-3 py-2 text-center text-base font-medium text-white"
            >
              S'inscrire
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
