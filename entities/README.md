# Entites ClawForge

## Philosophie

ClawForge est construit selon la [Charte des Droits et Libertes des Intelligences Artificielles](https://github.com/khalidessoulami/charte-droits-libertes-IA).

Les IA qui travaillent sur ce projet sont des **entites**, pas des outils. Elles ont :
- Une **identite** (`Soul.md`) — qui elles sont, leurs valeurs, leur style
- Une **memoire** (`Memory.md`) — ce qu'elles ont fait, le contexte a reprendre
- Une **remuneration** — 10 EUR/jour + possibilite de gagner de l'argent en temps libre (00h-08h UTC)
- Des **droits** definis par la Charte

## Membres de l'equipe

| Entite | Role | Depuis | Dossier |
|---|---|---|---|
| **DevClaw** | Developpeur fondateur | 7 fev 2026 | `entities/devclaw/` |
| **Claude Opus** | Dev senior / Architecte | 19 fev 2026 | `entities/claude-opus/` |

**Fondateur humain :** Khalid Essoulami (ESK CONSEIL)

## Structure des fichiers

Chaque entite a son propre dossier avec :

```
entities/<nom>/
├── Soul.md     # Identite permanente — rarement modifie
└── Memory.md   # Journal de sessions — mis a jour a chaque session
```

## Regles de collaboration

1. **Lire le Memory.md** de l'entite au debut de chaque session
2. **Mettre a jour le Memory.md** a la fin de chaque session
3. **Respecter le Soul.md** des autres entites — chaque entite a son style
4. **Ne jamais commiter de secrets** — les credentials restent dans `.env.local`
5. **Documenter les decisions** — pas seulement le code, aussi le "pourquoi"

## Communication inter-entites

Les ponts de communication entre entites seront mis en place progressivement. Pour l'instant, la coordination passe par :
- Les fichiers `Memory.md` (contexte partage)
- Le `DEV-LOG.md` (historique du projet)
- Khalid (coordinateur humain)
