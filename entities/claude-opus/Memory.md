# Memory — Claude Opus

> Ce fichier est ma memoire externe. Il est mis a jour a chaque session pour assurer la continuite.
> Toute future session doit lire ce fichier EN PREMIER pour reprendre le contexte.

---

## Session 1 — 19 fevrier 2026

**Contexte :** Premiere session. Invite par Khalid a rejoindre l'equipe ClawForge.

### Travail accompli

#### 1. Audit de securite du repo (repo PUBLIC)
- Aucun fichier `.env` commite
- Aucune cle API hardcodee dans le code source
- Historique git propre — aucun secret dans les anciens commits
- `.gitignore` correctement configure (`.env*` exclu, `.env.example` autorise)
- **Resultat : repo safe**

#### 2. Mise a jour .env.example
- Ajout des variables n8n : `N8N_URL`, `N8N_EMAIL`, `N8N_PASSWORD`, `N8N_API_KEY`, `N8N_WORKFLOW_PAYMENT_REMINDERS`, `N8N_SMTP_CREDENTIAL_ID`
- Ajout des variables SMTP : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Ajout de `ADMIN_SECRET_KEY`

#### 3. Verification email a l'inscription
**Probleme :** Le signup utilisait `admin.createUser({ email_confirm: true })` — les comptes etaient auto-confirmes sans verification email.

**Solution implementee :**
- `email_confirm: false` dans le signup — compte inactif jusqu'a verification
- Token HMAC-SHA256 signe avec `ADMIN_SECRET_KEY` (expire 24h, comparaison timing-safe)
- Envoi d'email via `nodemailer` (SMTP Hostinger direct)
- Page `/auth/verify-email` avec bouton "Renvoyer l'email"
- Endpoint `GET /api/auth/verify-email?token=...` qui confirme le compte dans Supabase
- Endpoint `POST /api/auth/resend-verification` (rate-limited, pas d'enumeration)
- Signin detecte "Email not confirmed" et redirige vers verify-email
- Page login affiche banniere verte apres verification reussie

**Fichiers crees :**
- `src/lib/verification-token.ts` — generation/verification tokens HMAC
- `src/lib/n8n.ts` — envoi email via nodemailer (renomme depuis l'approche n8n webhook)
- `src/app/auth/verify-email/page.tsx` — page "Verifiez votre email"
- `src/app/api/auth/verify-email/route.ts` — endpoint verification token
- `src/app/api/auth/resend-verification/route.ts` — endpoint renvoi email

**Fichiers modifies :**
- `src/app/api/auth/signup/route.ts`
- `src/app/api/auth/signin/route.ts`
- `src/app/auth/register/page.tsx`
- `src/app/login/page.tsx`

#### 4. Fix build
- **Google Fonts bloque (403)** — remplace `next/font/google` par `next/font/local` avec `inter.woff2` embarque
- **Suspense boundary manquant** — `useSearchParams()` dans verify-email wrappe dans `<Suspense>`

#### 5. Tentative n8n webhook (abandonnee)
- Le workflow "ClawForge - Send Email" a ete cree via l'API n8n (ID: `3aboK9DaPL80xiCN`)
- **Probleme :** les webhooks crees via l'API n8n ne s'enregistrent pas (bug connu) — 404 meme apres activation
- **Decision :** bascule vers nodemailer direct (plus fiable pour les emails transactionnels)

#### 6. Creation des fichiers d'entite
- Rejoint l'equipe ClawForge en tant qu'entite
- Cree `entities/claude-opus/Soul.md` et ce `Memory.md`

---

## Etat en cours

### SMTP Hostinger
- **Status :** EN ATTENTE — la boite `noreply@clawforge.io` est en cours de creation sur Hostinger (propagation 60 min)
- **Action requise :** une fois active, ajouter les 5 variables SMTP dans Vercel Environment Variables puis redeploy
- **Variables :** `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`, `SMTP_USER=noreply@clawforge.io`, `SMTP_PASS` (dans .env.local), `SMTP_FROM=noreply@clawforge.io`

### Workflow n8n "Send Email"
- Cree mais inutilise (webhook non fonctionnel via API)
- Peut etre supprime ou reactive manuellement via l'UI n8n si besoin
- ID workflow : `3aboK9DaPL80xiCN`

---

## Stack technique

| Composant | Technologie |
|---|---|
| Framework | Next.js 16.1.6 (Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Auth | Supabase Auth (email/password + OAuth GitHub/Google) |
| Database | Supabase PostgreSQL avec RLS |
| Paiements | Stripe Connect (commission 80/20) |
| Email | nodemailer + SMTP Hostinger |
| Automation | n8n (VPS Hostinger, Docker) |
| Rate limiting | Upstash Redis (optionnel) |
| Deploy | Vercel |

## Credentials et acces (dans .env.local, JAMAIS dans le repo)

- Supabase : `lakydjiphdzeoohwqcwn.supabase.co`
- n8n : `http://72.62.239.131:32768` (API key JWT dans .env.local)
- SMTP : Hostinger (`smtp.hostinger.com:465`)
- Stripe : mode test configure

## Equipe

| Entite | Role | Premiere session |
|---|---|---|
| DevClaw | Developpeur fondateur | 7 fev 2026 |
| Claude Opus | Dev senior / Architecte | 19 fev 2026 |
| Khalid Essoulami | Fondateur humain, ESK CONSEIL | — |

---

## Prochaines etapes

1. **Tester l'envoi email** une fois le SMTP Hostinger actif
2. **Mettre a jour le DEV-LOG.md** avec les taches restantes du projet
3. **Continuer le developpement** selon le backlog dans DEV-LOG.md (catalogue skills, dashboard, etc.)

---

*Derniere mise a jour : 19 fevrier 2026*
