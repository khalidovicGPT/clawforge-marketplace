'use client';

import { useState } from 'react';

export function BuyButton({ skillId, skillSlug, price, currency, pendingPaymentSetup }: {
  skillId: string;
  skillSlug: string;
  price: number;
  currency: string;
  pendingPaymentSetup?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || pendingPaymentSetup) return;
    setLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, skillSlug, price, currency }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      } else if (data.free) {
        window.location.href = `/checkout/success?skill_id=${skillId}&free=true`;
        return;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      alert('Erreur de connexion. Vérifiez votre connexion internet.');
    }
    setLoading(false);
  };

  const priceText = price === 0
    ? 'Gratuit'
    : new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 0,
      }).format(price / 100) + ' TTC';

  if (pendingPaymentSetup) {
    return (
      <div className="mt-6">
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-lg bg-gray-300 px-4 py-3 font-semibold text-gray-500"
        >
          Indisponible a la vente
        </button>
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-center text-sm text-amber-700">
            Paiement non active par le createur
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6">
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Redirection...' : price === 0 ? 'Telecharger gratuitement' : `Acheter pour ${priceText}`}
      </button>
      {price > 0 && (
        <p className="mt-2 text-center text-xs text-gray-500">
          Le prix inclut toutes les taxes applicables
        </p>
      )}
    </form>
  );
}
