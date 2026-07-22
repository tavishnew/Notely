import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Youtube,
  FileText,
  Mic,
  Globe,
  BookOpen,
  Layers,
  MessageSquare,
  Headphones,
  CheckCircle2,
} from "lucide-react";
import { NotelyLogo } from "@/components/NotelyLogo";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Your notebook — Notely" },
      { name: "description", content: "Your Notely workspace: notes, flashcards, quizzes and podcasts." },
      { property: "og:title", content: "Your notebook — Notely" },
      { property: "og:description", content: "Your Notely workspace." },
    ],
  }),
  component: AppPage,
});

const notes = [
  { title: "Neural Networks — 3Blue1Brown", source: "YouTube", icon: Youtube, tag: "AI", updated: "2h ago" },
  { title: "Attention Is All You Need", source: "PDF", icon: FileText, tag: "Papers", updated: "yesterday" },
  { title: "Lecture 07 — Thermodynamics", source: "Audio", icon: Mic, tag: "Physics", updated: "2d ago" },
  { title: "Tailwind v4 release notes", source: "Web", icon: Globe, tag: "Dev", updated: "3d ago" },
  { title: "Kahneman — System 1 & 2", source: "PDF", icon: FileText, tag: "Psych", updated: "1w ago" },
  { title: "How CRDTs work", source: "YouTube", icon: Youtube, tag: "Dev", updated: "1w ago" },
];

const actions = [
  { icon: Youtube, label: "From YouTube" },
  { icon: FileText, label: "From PDF" },
  { icon: Mic, label: "Record audio" },
  { icon: Globe, label: "From URL" },
];

const tools = [
  { icon: BookOpen, label: "Notes" },
  { icon: Layers, label: "Flashcards" },
  { icon: CheckCircle2, label: "Quizzes" },
  { icon: Headphones, label: "Podcast" },
  { icon: MessageSquare, label: "Assistant" },
];

function AppPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/40 p-5 md:block">
        <Link to="/" className="flex items-center gap-2.5">
          <NotelyLogo className="h-8 w-8" />
          <span className="font-display text-lg font-bold">Notely</span>
        </Link>

        <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-transform hover:scale-[1.02]">
          <Plus className="h-4 w-4" /> New note
        </button>

        <nav className="mt-6 space-y-1">
          {tools.map((t) => (
            <button
              key={t.label}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <t.icon className="h-4 w-4 text-primary" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Tags
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 px-3">
            {["AI", "Papers", "Physics", "Dev", "Psych"].map((t) => (
              <span key={t} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search your notes, flashcards, transcripts…"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Landing
          </Link>
        </header>

        <div className="mx-auto max-w-6xl px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl font-bold tracking-tight">
              Good morning — what are we learning today?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Drop in a source and Notely takes it from there.
            </p>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.06, delayChildren: 0.15 }}
            className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4"
          >
            {actions.map((a) => (
              <motion.button
                key={a.label}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -4 }}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-base font-semibold">{a.label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* Recent notes */}
          <div className="mt-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-bold">Recent notes</h2>
              <button className="text-sm font-medium text-muted-foreground hover:text-foreground">
                View all →
              </button>
            </div>

            <motion.ul
              initial="hidden"
              animate="show"
              transition={{ staggerChildren: 0.05 }}
              className="grid gap-3 md:grid-cols-2"
            >
              {notes.map((n) => (
                <motion.li
                  key={n.title}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  whileHover={{ y: -2 }}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <span className="rounded-xl bg-secondary p-2.5">
                    <n.icon className="h-5 w-5 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{n.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {n.source} · {n.updated}
                    </div>
                  </div>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                    {n.tag}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </main>
    </div>
  );
}
