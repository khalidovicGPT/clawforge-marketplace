'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Skill } from '@/types/database';

interface BuyButtonProps {
  skill: Skill;
}

export function BuyButton({ skill }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleBuy = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: skill.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login
          router.push(`/login?redirect=/skills/${skill.slug}`);
          return;
        }
        throw new Error(data.error || 'Erreur lors de l\'achat');
      }

      if (data.type === 'free' || data.type === 'already_purchased') {
        // Redirect to download page
        router.push(data.redirectUrl);
      } else if (data.type === 'checkout' && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement...
          </span>
        ) : skill.price_type === 'free' ? (
          'Télécharger gratuitement'
        ) : (
          'Acheter maintenant'
        )}
      </button>
      
      {error && (
        <p className="mt-2 text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
