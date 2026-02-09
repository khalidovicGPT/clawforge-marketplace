'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Download, CreditCard } from 'lucide-react';

interface BuyButtonProps {
  skillId: string;
  skillSlug: string;
  price: number;
  currency: string;
}

export function BuyButton({ skillId, skillSlug, price, currency }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skillId,
          skillSlug,
          price,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.free) {
        // Free download - redirect to success
        router.push(`/checkout/success?skill_id=${skillId}&free=true`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const isFree = price === 0;
  const priceFormatted = isFree 
    ? 'Gratuit' 
    : new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 0,
      }).format(price / 100);

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Redirection...
        </>
      ) : isFree ? (
        <>
          <Download className="h-5 w-5" />
          Télécharger gratuitement
        </>
      ) : (
        <>
          <CreditCard className="h-5 w-5" />
          Acheter pour {priceFormatted}
        </>
      )}
    </button>
  );
}
