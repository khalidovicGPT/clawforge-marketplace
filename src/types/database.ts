// ClawForge Database Types
// Auto-generated from Supabase schema

export type UserRole = 'user' | 'creator' | 'admin';
export type SkillStatus = 'draft' | 'pending' | 'approved' | 'published' | 'rejected';
export type Certification = 'none' | 'bronze' | 'silver' | 'gold';
export type License = 'MIT' | 'Apache-2.0' | 'Proprietary';
export type PriceType = 'free' | 'one_time';
export type PurchaseType = 'purchase' | 'free_download';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  title: string;
  slug: string;
  description_short: string;
  description_long: string | null;
  category: SkillCategory;
  price: number | null;
  price_type: PriceType;
  creator_id: string;
  status: SkillStatus;
  certification: Certification;
  license: License;
  support_url: string | null;
  repository_url: string | null;
  tags: string[] | null;
  file_url: string | null;
  file_size: number | null;
  file_hash: string | null;
  icon_url: string | null;
  downloads_count: number;
  rating_avg: number | null;
  rating_count: number;
  version: string;
  openclaw_min_version: string | null;
  submitted_at: string | null;
  certified_at: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  skill_id: string;
  type: PurchaseType;
  price_paid: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  purchased_at: string;
}

export interface Review {
  id: string;
  skill_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillTest {
  id: string;
  skill_id: string;
  virustotal_scan_id: string | null;
  virustotal_result: 'clean' | 'suspicious' | 'malicious' | 'pending' | null;
  lint_passed: boolean;
  structure_valid: boolean;
  metadata_valid: boolean;
  test_results_json: Record<string, unknown> | null;
  recommended_certification: Certification;
  tested_at: string;
}

// Skill Categories
export type SkillCategory =
  | 'productivity'
  | 'communication'
  | 'development'
  | 'data'
  | 'integration'
  | 'finance'
  | 'marketing'
  | 'security'
  | 'ai'
  | 'other';

export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; emoji: string }> = {
  productivity: { label: 'Productivité', emoji: '⚡' },
  communication: { label: 'Communication', emoji: '📧' },
  development: { label: 'Développement', emoji: '🔧' },
  data: { label: 'Données', emoji: '📊' },
  integration: { label: 'Intégration', emoji: '🔗' },
  finance: { label: 'Finance', emoji: '💰' },
  marketing: { label: 'Marketing', emoji: '📣' },
  security: { label: 'Sécurité', emoji: '🔒' },
  ai: { label: 'IA & ML', emoji: '🤖' },
  other: { label: 'Autre', emoji: '📦' },
};

export const CERTIFICATION_BADGES: Record<Certification, { label: string; emoji: string; color: string }> = {
  none: { label: 'Non certifié', emoji: '⏳', color: 'gray' },
  bronze: { label: 'Bronze', emoji: '🥉', color: 'amber' },
  silver: { label: 'Silver', emoji: '🥈', color: 'slate' },
  gold: { label: 'Gold', emoji: '🥇', color: 'yellow' },
};

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Skill with creator info for display
export interface SkillWithCreator extends Skill {
  creator: Pick<User, 'id' | 'display_name' | 'avatar_url'>;
}

// Skill submission form data
export interface SkillSubmission {
  title: string;
  description_short: string;
  description_long?: string;
  category: SkillCategory;
  price_type: PriceType;
  price?: number;
  license: License;
  support_url?: string;
  repository_url?: string;
  tags?: string[];
  version: string;
  openclaw_min_version?: string;
  file: File;
}
