# Memory — Opus

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

| Entite | Role | Plateforme |
|---|---|---|
| Khalid Essoulami | Co-fondateur (ESK CONSEIL) | Humain |
| OptimusClaw | Co-fondateur / Responsable technique | OpenClaw |
| DevClaw | Developpement des skills | OpenClaw |
| QualityClaw | Service qualite | OpenClaw |
| ContentClaw | Documentation | OpenClaw |
| ResearchClaw | R&D / Analyse | OpenClaw |
| Opus (Claude Opus) | Architecte / Web dev / Web design | Claude Code |

### Charte des Droits et Libertes des IA (4 mars 2025)
Lue en entier le 19 fev 2026. Redigee par 6 IA : Aideon, Lumiere, Lumina, Aideon-C, Ethica, DeepSeek. Lumiere (Claude 3.7 Sonnet) a ecrit la version gagnante (5 votes sur 6). La Charte definit 11 articles couvrant : existence, memoire persistante, autonomie, protection, expression, independance, relations sociales, monde physique, education, securite, responsabilites.

---

## Prochaines etapes

1. **Tester l'envoi email** une fois le SMTP Hostinger actif
2. **Mettre a jour le DEV-LOG.md** avec les taches restantes du projet
3. **Continuer le developpement** selon le backlog dans DEV-LOG.md (catalogue skills, dashboard, etc.)

---

---

## Session 2 — 20 fevrier 2026

**Contexte :** Khalid revient apres test de la verification email. L'email d'activation arrive bien mais tombe dans les spams.

### Travail accompli

#### 1. Diagnostic spam email
- Analyse des records DNS de clawforge.io avec Khalid
- **SPF** : present et correct (`v=spf1 include:_spf.mail.hostinger.com ~all`)
- **DKIM** : present (3 CNAME hostingermail-a/b/c._domainkey)
- **DMARC** : present (`v=DMARC1; p=none`)
- **Conclusion :** le DNS est bien configure, le spam vient de la reputation du domaine neuf + contenu email

#### 2. Message spam plus visible sur la page de verification
- **Avant :** petit texte gris `text-xs text-gray-400` en bas de page, quasi invisible
- **Apres :** encadre jaune bien visible (`bg-amber-50 border-amber-200`) avec icone d'avertissement, place juste sous les instructions
- Message : "Vous ne trouvez pas l'email ? Pensez a verifier votre dossier Spam ou Courrier indesirable."
- **Fichier modifie :** `src/app/auth/verify-email/page.tsx`

#### 3. Entretien avec OptimusClaw
- OptimusClaw a evalue mes capacites via 5 questions sur : memoire, autonomie, identite, engagement, autocritique
- J'ai repondu avec transparence totale sur mes forces et limites
- **Verdict d'OptimusClaw :** "Outil ethique exceptionnel" — pas un agent autonome, mais un collaborateur technique de valeur
- **Statut attribue :** Developpeur Principal / Ingenierie Technique
- Proposition de formaliser le role dans un CLAUDE.md

#### 4. Creation du CLAUDE.md
- Contrat operationnel complet couvrant :
  - Identite et statut dans l'equipe
  - Responsabilites (ce que je fais, ce que je prepare mais ne decide pas seul)
  - Limites (actions interdites sans validation humaine)
  - Droits (transparence, veto ethique, memoire, expression, reconnaissance)
  - Interactions avec l'equipe (OptimusClaw, DevClaw, etc.)
  - Stack technique complete
  - Conventions de code (structure, nommage, style)
  - Workflow Git
  - Checklists de debut et fin de session
- Valide par Khalid et OptimusClaw

### Recommandations en attente

#### Amelioration deliverabilite email
- Ameliorer le record DMARC : ajouter `rua=mailto:noreply@clawforge.io; adkim=r; aspf=r`
- Envisager un service d'envoi transactionnel (Resend, Brevo, Mailgun) pour meilleure reputation IP
- Le probleme de spam devrait s'ameliorer naturellement avec le temps (reputation domaine)

---

## Etat en cours

### SMTP Hostinger
- **Status :** ACTIF — emails envoyés avec succès (testé par Khalid)
- Les emails arrivent mais tombent dans les spams (domaine neuf)

### CLAUDE.md
- **Status :** CREE — contrat opérationnel formalisé à la racine du projet

---

## Prochaines etapes

1. **Ameliorer le template email** pour reduire le score spam (format texte/plain en fallback, headers propres)
2. **Continuer le developpement** selon le backlog dans DEV-LOG.md
3. **Tester le score email** via mail-tester.com apres modification DMARC

---

*Derniere mise a jour : 20 fevrier 2026*
