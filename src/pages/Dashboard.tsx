import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  FileAudio,
  FileText,
  Globe,
  Loader2,
  MonitorPlay,
  MoreVertical,
  Play,
  Trash2,
} from "lucide-react";
import CreateNoteModal, { type NoteSource } from "../components/CreateNoteModal";
import { downloadText, exportMarkdown } from "../lib/export";
import { createNoteFromSources } from "../lib/generation/pipeline";
import type { IngestInput } from "../lib/ingest";
import { useApp } from "../lib/app";
import type { Job, Note, SourceKind } from "../lib/types";

type MotionStyle = CSSProperties & Partial<Record<"--enter-delay", string>>;
type AppShellContext = { query: string };

const creationCards: {
  source: NoteSource;
  title: string;
  icon: typeof MonitorPlay;
}[] = [
  { source: "link", title: "From YouTube", icon: MonitorPlay },
  { source: "document", title: "From PDF", icon: FileText },
  { source: "audio", title: "Record audio", icon: FileAudio },
  { source: "link", title: "From URL", icon: Globe },
];

function sourceIcon(kind: SourceKind) {
  if (kind === "youtube") return Play;
  if (kind === "audio") return FileAudio;
  if (kind === "url") return Globe;
  return FileText;
}

function sourceLabel(kind: SourceKind) {
  if (kind === "youtube") return "YouTube";
  if (kind === "pdf") return "PDF";
  if (kind === "docx") return "Document";
  if (kind === "audio") return "Audio";
  if (kind === "url") return "Web";
  return "Note";
}

function tagFor(kind: SourceKind) {
  if (kind === "youtube") return "AI";
  if (kind === "pdf" || kind === "docx") return "Papers";
  if (kind === "audio") return "Physics";
  if (kind === "url") return "Dev";
  return "Notes";
}

function relTime(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo > 1 ? "s" : ""} ago`;
  return `${Math.floor(mo / 12)} year${mo >= 24 ? "s" : ""} ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { query } = useOutletContext<AppShellContext>();
  const { repo, engine, prefs, version, bump } = useApp();
  const [modal, setModal] = useState<NoteSource | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    repo?.listNotes().then(setNotes);
  }, [repo, version]);

  async function handleGenerate(inputs: IngestInput[]) {
    if (!repo) return;
    if (!engine) {
      setModal(null);
      setErr("Set up your engine in Settings first (pick Local or add a key).");
      return;
    }
    setErr(null);
    try {
      const id = await createNoteFromSources({
        repo,
        engine,
        inputs,
        language: prefs.language,
        onProgress: setJob,
      });
      setModal(null);
      setJob(null);
      bump();
      navigate(`/notes/${id}/editor`);
    } catch (e) {
      setJob(null);
      setModal(null);
      setErr(e instanceof Error ? e.message : "Generation failed.");
    }
  }

  const filtered = notes.filter((note) =>
    note.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="motion-enter">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Good morning - what are we learning today?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Drop in a source and Notely takes it from there.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {creationCards.map(({ source, title, icon: Icon }, i) => (
          <button
            key={title}
            onClick={() => setModal(source)}
            className="motion-rise group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            style={{ "--enter-delay": `${i * 60}ms` } as MotionStyle}
            type="button"
          >
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-display text-base font-semibold">{title}</span>
          </button>
        ))}
      </div>

      {err && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/15 px-4 py-3 text-sm font-semibold text-destructive">
          {err}
        </div>
      )}

      <div className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">Recent notes</h2>
          {filtered.length > 0 && (
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground" type="button">
              View all -&gt;
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <Empty
            title={query ? "No matching notes" : "No notes yet"}
            sub={
              query
                ? "Try a different search."
                : "Create your first note from a recording, document, or link above."
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((note, i) => {
              const Icon = sourceIcon(note.sourceKind);
              return (
                <div
                  key={note.id}
                  onClick={() => navigate(`/notes/${note.id}/editor`)}
                  className="motion-rise group flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{ "--enter-delay": `${i * 50}ms` } as MotionStyle}
                >
                  <span className="rounded-xl bg-secondary p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{note.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {sourceLabel(note.sourceKind)} - {relTime(note.lastOpenedAt)}
                    </div>
                  </div>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                    {tagFor(note.sourceKind)}
                  </span>
                  <RowMenu
                    onExport={() =>
                      downloadText(`${note.title}.md`, exportMarkdown(note), "text/markdown")
                    }
                    onDelete={async () => {
                      await repo?.deleteNote(note.id);
                      bump();
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <CreateNoteModal
          source={modal}
          busy={!!job}
          onGenerate={handleGenerate}
          onClose={() => setModal(null)}
        />
      )}
      {job && <JobOverlay job={job} />}
    </div>
  );
}

function RowMenu({ onExport, onDelete }: { onExport: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg p-2 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100"
        aria-label="More"
        type="button"
      >
        <MoreVertical className="h-4.5 w-4.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-border bg-card p-1 shadow-modal">
            <button
              onClick={() => {
                onExport();
                setOpen(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
              type="button"
            >
              Export Markdown
            </button>
            <button
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/15"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-1 py-16 text-center">
      <p className="font-display text-lg font-semibold text-muted-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function JobOverlay({ job }: { job: Job }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[440px] max-w-[90vw] rounded-modal bg-card p-8 shadow-modal">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <h2 className="font-display text-xl font-bold">{job.message}</h2>
        </div>
        {job.files && job.files.length > 1 && (
          <ul className="mt-4 space-y-1.5">
            {job.files.map((file, i) => (
              <li key={i} className="flex items-center justify-between gap-4 text-sm">
                <span className="truncate text-muted-foreground">{file.name}</span>
                <span
                  className={
                    file.status === "done"
                      ? "text-green-600"
                      : file.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }
                >
                  {file.status === "done"
                    ? "done"
                    : file.status === "error"
                      ? file.error || "failed"
                      : file.status === "running"
                        ? "running"
                        : "queued"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
