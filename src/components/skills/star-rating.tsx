'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface StarRatingProps {
  skillId: string;
  initialRating?: number;
}

export function StarRating({ skillId, initialRating = 0 }: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  async function handleRate(value: number) {
    if (saving) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_id: skillId, rating: value }),
      });

      const data = await res.json();

      if (res.ok) {
        setRating(value);
        setMessage({ text: `${value}/5 enregistre !`, type: 'success' });
        // Refresh server components to update displayed ratings
        router.refresh();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: data.error || 'Erreur', type: 'error' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({ text: 'Erreur reseau', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= (hover || rating);
        return (
          <button
            key={value}
            type="button"
            disabled={saving}
            onClick={() => handleRate(value)}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 transition disabled:opacity-50"
            title={`${value}/5`}
          >
            <Star
              className={`h-5 w-5 transition ${
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-300'
              }`}
            />
          </button>
        );
      })}
      {message && (
        <span className={`ml-1 text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {message.text}
        </span>
      )}
      {saving && (
        <span className="ml-1 text-xs text-gray-400">...</span>
      )}
    </div>
  );
}
