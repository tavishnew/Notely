import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Headphones,
  Home,
  Layers,
  MessageSquare,
  Palette,
  Plus,
  Search,
  Settings as SettingsIcon,
} from "lucide-react";
import { NotelyLogo } from "./NotelyLogo";
import { useApp } from "../lib/app";
import { now, uuid } from "../lib/ids";
import { toggleTheme } from "../lib/theme";
import type { Note } from "../lib/types";

const navItems = [
  { to: "", label: "Notes", icon: Home },
  { to: "settings", label: "Settings", icon: SettingsIcon },
];

const tools = [
  { icon: BookOpen, label: "Notes" },
  { icon: Layers, label: "Flashcards" },
  { icon: CheckCircle2, label: "Quizzes" },
  { icon: Headphones, label: "Podcast" },
  { icon: MessageSquare, label: "Assistant" },
];

export default function AppShell() {
  const navigate = useNavigate();
  const { repo, bump } = useApp();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function createBlank() {
    if (!repo) return;
    const note: Note = {
      id: uuid(),
      title: "Untitled Document",
      sourceKind: "blank",
      sourceText: "",
      blocks: [],
      createdAt: now(),
      updatedAt: now(),
      lastOpenedAt: now(),
    };
    await repo.putNote(note);
    bump();
    navigate(`/notes/${note.id}/editor`);
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/40 p-5 md:block">
        <Link to="/" className="flex items-center gap-2.5">
          <NotelyLogo className="h-8 w-8" />
          <span className="font-display text-lg font-bold">Notely</span>
        </Link>

        <button
          onClick={createBlank}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-transform hover:scale-[1.02]"
          type="button"
        >
          <Plus className="h-4 w-4" /> New note
        </button>

        <nav className="mt-6 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ""}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </NavLink>
          ))}
          {tools.slice(1).map((t) => (
            <button
              key={t.label}
              type="button"
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
            {["AI", "Papers", "Physics", "Dev", "Psych"].map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => toggleTheme()}
          className="mt-8 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
          type="button"
        >
          <Palette className="h-4 w-4 text-primary" />
          Theme
        </button>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your notes, flashcards, transcripts..."
              className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Landing
          </Link>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet context={{ query }} />
        </div>
      </main>
    </div>
  );
}
