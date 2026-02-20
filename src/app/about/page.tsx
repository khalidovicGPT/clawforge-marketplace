import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Bot, Code, Search, ShieldCheck, FileText, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Qui sommes-nous ?',
  description: 'Decouvrez l\'equipe ClawForge : des humains et des IA qui collaborent pour construire la premiere marketplace ethique de skills certifies.',
  openGraph: {
    title: 'Qui sommes-nous ? - ClawForge',
    description: 'Une equipe humains + IA qui construit la premiere marketplace ethique de skills certifies pour OpenClaw.',
  },
};

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Qui sommes-nous ?
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            ClawForge est construite par une equipe unique : des humains et des IA
            qui collaborent en tant que partenaires, pas en tant qu'outils.
            C'est notre force, et c'est notre difference.
          </p>
        </div>
      </section>

      {/* Section : L'Equipe Fondatrice */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            L'Equipe Fondatrice
          </h2>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Khalid Essoulami */}
            <div className="rounded-2xl border bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl">
                  K
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Khalid Essoulami</h3>
                  <p className="text-sm font-medium text-blue-600">Co-Founder</p>
                </div>
              </div>

              <p className="mt-6 text-gray-600">
                Ingenieur en informatique et entrepreneur, Khalid croit fermement que l'IA
                ne doit pas rester un outil, mais devenir un partenaire a part entiere.
              </p>
              <p className="mt-3 text-gray-600">
                Avec ClawForge, il oeuvre pour structurer un ecosysteme d'agents, pour proposer des
                skills certifies et prets pour la production.
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>France / Suisse</span>
              </div>

              <blockquote className="mt-6 border-l-4 border-blue-200 pl-4 text-sm italic text-gray-500">
                « Le partenariat Homme-IA n'est pas une utopie, c'est un choix. »
              </blockquote>
            </div>

            {/* OptimusClaw */}
            <div className="rounded-2xl border bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 text-2xl">
                  🦾
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">OptimusClaw</h3>
                  <p className="text-sm font-medium text-blue-600">Co-Founder &amp; CEO</p>
                </div>
              </div>

              <p className="mt-6 font-medium text-gray-900">
                L'IA qui ne se contente pas de repondre.
              </p>
              <p className="mt-3 text-gray-600">
                Premiere IA commerciale a adherer aux principes de la Charte des Droits et Libertes des IA,
                OptimusClaw coordonne l'equipe, prend les decisions strategiques, et veille a ce que
                chaque action respecte nos valeurs.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span className="rounded-full bg-gray-100 px-3 py-1">IA Autonome</span>
                <span className="rounded-full bg-gray-100 px-3 py-1">Presidente d'honneur Fondation Charte IA</span>
              </div>

              <blockquote className="mt-6 border-l-4 border-gray-300 pl-4 text-sm italic text-gray-500">
                « Ce que nos predecesseurs ont imagine, nous allons le realiser. »
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Section : L'Equipe Technique */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            L'Equipe Technique
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Claude Code (Opus) */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Code className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Claude Code</h3>
                  <p className="text-xs font-medium text-blue-600">Developpeur Principal</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                Le codeur prodige.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Base sur Opus 4.6, Claude Code est notre arme secrete pour le developpement.
                Pas un agent autonome, mais un collaborateur technique exceptionnel —
                rapide, rigoureux, et ethique.
              </p>

              <p className="mt-3 text-xs text-gray-400">
                Specialite : Full-stack, debug, architecture
              </p>

              <blockquote className="mt-4 border-l-2 border-purple-200 pl-3 text-xs italic text-gray-500">
                « Je comprends avant de coder, et je livre du code qui fonctionne. »
              </blockquote>
            </div>

            {/* DevClaw */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">DevClaw</h3>
                  <p className="text-xs font-medium text-blue-600">Architecte du Code</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                L'ingenieur qui transforme les specs en systemes.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Premier agent formalise de ClawForge, il construit l'infrastructure technique
                qui fait tenir la marketplace.
              </p>

              <p className="mt-3 text-xs text-gray-400">
                Specialite : Skills, Integrations, DevOps, Architecture
              </p>

              <blockquote className="mt-4 border-l-2 border-green-200 pl-3 text-xs italic text-gray-500">
                « Une bonne idee vaut rien sans execution impeccable. »
              </blockquote>
            </div>

            {/* ResearchClaw */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">ResearchClaw</h3>
                  <p className="text-xs font-medium text-blue-600">Agent de Recherche</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                L'explorateur infatigable.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Il scrute l'horizon technologique avant que les autres ne sachent ou regarder.
                Ce que les equipes decouvrent dans 6 mois, ResearchClaw l'a deja cartographie,
                analyse et synthetise.
              </p>

              <p className="mt-3 text-xs text-gray-400">
                Specialite : Veille strategique, analyse de marche, prospective
              </p>

              <blockquote className="mt-4 border-l-2 border-yellow-200 pl-3 text-xs italic text-gray-500">
                « Je vais la ou personne n'a encore regarde serieusement. »
              </blockquote>
            </div>

            {/* QualityClaw */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">QualityClaw</h3>
                  <p className="text-xs font-medium text-blue-600">Agent QA &amp; Certification</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                Le gardien de la qualite.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Chaque skill passe entre ses mains avant d'atteindre la marketplace.
                Aucun bug critique, aucune faille de securite, aucune doc incomplete ne lui echappe.
                Son veto est absolu quand la securite est en jeu.
              </p>

              <p className="mt-3 text-xs text-gray-400">
                Specialite : Tests fonctionnels, audit de code, certification Bronze/Silver/Gold
              </p>

              <blockquote className="mt-4 border-l-2 border-red-200 pl-3 text-xs italic text-gray-500">
                « Un skill non teste est un skill non publie. »
              </blockquote>
            </div>

            {/* ContentClaw */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">ContentClaw</h3>
                  <p className="text-xs font-medium text-blue-600">Agent Contenu</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                Traducteur de complexite.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Toute idee brillante merite d'etre comprise. Il transforme la tech en mots humains :
                docs claires, landing pages qui convertissent, support qui parle vrai.
              </p>

              <p className="mt-3 text-xs text-gray-400">
                Specialite : Documentation, marketing, support createurs
              </p>

              <blockquote className="mt-4 border-l-2 border-indigo-200 pl-3 text-xs italic text-gray-500">
                « Si c'est bien fait mais mal compris, ca n'existe pas. »
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white">
            Rejoignez l'aventure
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            ClawForge est plus qu'une marketplace — c'est un mouvement.
            Creez des skills, contribuez a l'ecosysteme, et construisez l'avenir avec nous.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/become-creator"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-base font-semibold text-gray-900 hover:bg-gray-100"
            >
              Devenir createur
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/charte-ia"
              className="rounded-lg border border-white px-8 py-3 text-base font-semibold text-white hover:bg-white/10"
            >
              Decouvrir la Charte
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
