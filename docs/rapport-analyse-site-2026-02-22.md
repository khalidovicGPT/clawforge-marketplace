# Rapport d'analyse complete — ClawForge Marketplace

> **Date :** 22 fevrier 2026
> **Auteur :** Opus (Claude Opus 4.6)
> **Demande par :** Khalid
> **Statut :** A traiter apres les corrections en cours

---

## Etat general du projet

| Module | Progression | Qualite |
|--------|-------------|---------|
| Auth (email + OAuth) | 90% | 8/10 |
| Pages UI (accueil, catalogue, detail, about...) | 85% | 8/10 |
| Dashboard createur | 75% | 8/10 |
| Dashboard admin | 70% | 7/10 |
| Paiements Stripe Connect | 60% | 7/10 |
| API Backend | 70% | 7/10 |
| SEO & Metadata | 60% | 7/10 |
| Tests | 10% | 3/10 |
| Securite | 55% | 5/10 |
| Performance | 40% | 5/10 |
| **Global** | **~65%** | **6.5/10** |

---

## AXE 1 — SECURITE (Critique)

### Critiques
1. **`/api/stripe/debug` expose en production** — cet endpoint affiche les cles Stripe (meme tronquees), le mode test/live, et des donnees utilisateurs. A supprimer immediatement.
2. **Open redirect dans `/api/auth/callback`** — le parametre `next` n'est pas valide, un attaquant peut rediriger vers un site malveillant apres login.
3. **SSRF dans la certification** — `runSkillCertification` telecharge un `file_url` sans validation, ce qui pourrait cibler des services internes.
4. **`/api/skills/validate` sans authentification** — permet des uploads ZIP anonymes, risque de DoS.

### Importants
5. **Pas d'idempotence sur les webhooks Stripe** — un webhook rejoue pourrait creer des achats en double.
6. **Pas de rate limiting sur le reset password** — enumeration d'emails possible.
7. **Pas de verrouillage apres echecs de login** — brute force possible.
8. **Tokens de verification dans l'URL** — risque de fuite via les headers Referer.

---

## AXE 2 — PERFORMANCE (Haut)

### Images
- **`images: { unoptimized: true }` dans next.config.ts** — desactive completement l'optimisation d'images Next.js.
- Le code utilise des balises `<img>` brutes au lieu de `<Image>` de Next.js partout (accueil, catalogue, header, dashboard).

### Caching
- **Aucune strategie de cache** — pas de headers HTTP, pas d'ISR (Incremental Static Regeneration), pas de revalidation.
- Seul le storage Supabase a un `cacheControl: '3600'`.

### Requetes N+1
- La page catalogue fait une requete par createur pour resoudre les noms (au lieu d'un JOIN).
- L'admin charge toutes les skills sans pagination.
- La verification des cles API fait un `bcrypt.compare` en boucle sur toutes les cles (O(n)).

### Quick wins
- Activer l'optimisation d'images
- Ajouter `generateStaticParams()` pour les skills populaires
- Ajouter de la pagination sur tous les endpoints de liste
- Optimiser les requetes avec des JOINs Supabase

---

## AXE 3 — SEO (Moyen-Haut)

### Ce qui est bien fait
- Metadata comprehensive sur toutes les pages (title, description, OpenGraph, Twitter)
- Locale `fr_FR` correcte
- `generateMetadata()` dynamique sur les pages skills

### Ce qui manque
- **Pas de `sitemap.xml`** — indispensable pour le crawling Google
- **Pas de `robots.txt`** — les moteurs ne savent pas quoi indexer
- **Pas de structured data (JSON-LD)** — pas de rich snippets dans Google (produits, organisation, evaluations)
- **Pas d'URLs canoniques** — risque de contenu duplique
- **Pas de `manifest.json`** — pas de support PWA
- **Pas de favicon** defini dans la metadata

---

## AXE 4 — UX / UI (Moyen)

### Points forts
- Design visuellement coherent (palette, typographie, spacing) — 8.5/10
- Pages "A propos", "FAQ", "Comment ca marche" excellentes — 9/10
- Formulaire de soumission de skill tres complet — 8.5/10
- Page detail skill avec sticky purchase card — 9/10

### A ameliorer
1. **Gestion des erreurs inconstante** — certains composants utilisent `alert()` natif (BuyButton, NewSkill), d'autres des messages inline. Il faut un systeme de toast/notifications global.
2. **Pas d'etat actif dans la navigation** — on ne sait pas sur quelle page on est.
3. **Pas de skeleton loaders uniformes** — certaines pages montrent un spinner, d'autres rien.
4. **Accessibilite partielle** (6.5/10) — attributs ARIA manquants, focus states peu visibles, certaines images sans `alt`.
5. **Pas de dark mode** — les variables CSS sont pres, mais pas de toggle.
6. **Reviews sans pagination** — probleme si une skill a beaucoup d'avis.
7. **Pas de favoris/wishlist** — fonctionnalite attendue sur un marketplace.

---

## AXE 5 — TESTS (Bas mais important)

- **Seulement 13 tests** dans 3 fichiers (validation categories, rate limiting, API query).
- **Zero test de composant React**, zero test d'API endpoint, zero test d'integration, zero E2E.
- L'infrastructure Vitest + React Testing Library est en place, mais sous-utilisee.
- Priorites : tester les flows critiques (auth, paiement, upload skill, certification).

---

## AXE 6 — ARCHITECTURE BACKEND (Moyen)

1. **Inconsistance de nommage** — `display_name` en DB vs `name` dans les types TypeScript.
2. **23 casts `any`** dans les routes admin — perte de type safety.
3. **Pattern fragile** sur les routes admin : essaie un JOIN, s'il echoue fait un fallback manuel.
4. **Calcul de rating dans le code app** au lieu d'un trigger DB — risque de race condition.
5. **Envoi d'email synchrone** dans les handlers API — ralentit la reponse.
6. **Pas d'audit log** pour les actions admin (certification, promotion, revocation).

---

## Plan d'action propose

### Sprint 1 — Securite & Performance (urgent)

| # | Tache | Impact |
|---|-------|--------|
| 1 | Supprimer `/api/stripe/debug` | Critique |
| 2 | Proteger l'open redirect dans callback | Critique |
| 3 | Ajouter rate limiting sur validate et reset-password | Haut |
| 4 | Activer `images: { unoptimized: false }` + migrer vers `<Image>` | Haut |
| 5 | Ajouter idempotence aux webhooks Stripe | Haut |
| 6 | Ajouter sitemap.ts + robots.txt | Moyen |

### Sprint 2 — UX & SEO

| # | Tache | Impact |
|---|-------|--------|
| 7 | Creer un systeme de toast/notifications global | Haut |
| 8 | Ajouter structured data JSON-LD | Moyen |
| 9 | Optimiser les requetes N+1 (JOINs, pagination) | Moyen |
| 10 | Ajouter un etat actif dans la navigation | Moyen |
| 11 | Harmoniser les skeleton loaders | Moyen |
| 12 | Ameliorer l'accessibilite (ARIA, focus, alt) | Moyen |

### Sprint 3 — Qualite & Features

| # | Tache | Impact |
|---|-------|--------|
| 13 | Ecrire des tests pour les flows critiques (auth, paiement) | Haut |
| 14 | Corriger les inconsistances de types (name/display_name) | Moyen |
| 15 | Ajouter un audit log admin | Moyen |
| 16 | Pagination des reviews | Moyen |
| 17 | Systeme de favoris/wishlist | Bas |
| 18 | Dark mode | Bas |

---

*Rapport genere le 22 fevrier 2026 par Opus — a revisiter apres les corrections en cours*
