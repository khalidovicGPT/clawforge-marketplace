import { Suspense } from 'react';
import { Metadata } from 'next';
import { SuccessContent } from './success-content';

export const metadata: Metadata = {
  title: 'Paiement confirmé',
  description: 'Votre achat a été confirmé. Téléchargez votre skill maintenant.',
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
