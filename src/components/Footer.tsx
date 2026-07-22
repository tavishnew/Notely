import { NotelyLogo } from "./NotelyLogo";

export function Footer() {
  return (
    <footer className="border-t border-edge/60 bg-bg">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
        <div className="flex items-center gap-2.5">
          <NotelyLogo className="h-7 w-7" />
          <span className="font-display font-semibold">Notely</span>
          <span className="text-sm text-ink-dim">— notes that stick.</span>
        </div>
        <p className="text-xs text-ink-dim">
          © {new Date().getFullYear()} Notely. Local-first, AGPL licensed.
        </p>
      </div>
    </footer>
  );
}
