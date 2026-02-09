'use client';

import { useState } from 'react';

export function BuyButton({ skillId, skillSlug, price, currency }: { 
  skillId: string; 
  skillSlug: string;
  price: number; 
  currency: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
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
      } else if (data.free) {
        window.location.href = `/checkout/success?skill_id=${skillId}&free=true`;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const priceText = price === 0 
    ? 'Gratuit' 
    : new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 0,
      }).format(price / 100);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{ cursor: 'pointer' }}
      className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Redirection...' : price === 0 ? 'Télécharger gratuitement' : `Acheter pour ${priceText}`}
    </button>
  );
}
