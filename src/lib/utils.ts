import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price in cents to display string
 */
export function formatPrice(priceInCents: number | null, currency = 'EUR'): string {
  if (priceInCents === null || priceInCents === 0) {
    return 'Gratuit';
  }
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(priceInCents / 100);
}

/**
 * Format date to French locale
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

/**
 * Format number with French locale
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Slugify a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get initials from a name
 */
export function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return 'N/A';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Calculate average rating
 */
export function formatRating(rating: number | null): string {
  if (rating === null) return 'N/A';
  return rating.toFixed(1);
}
