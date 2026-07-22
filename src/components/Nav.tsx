import { Link } from "react-router-dom";
import { NotelyLogo } from "./NotelyLogo";

export function Nav() {
  return (
    <header className="motion-rise sticky top-0 z-50 border-b border-edge/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <NotelyLogo className="h-8 w-8" />
          <span className="font-display text-xl font-bold tracking-tight">Notely</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-dim md:flex">
          <a href="#features" className="transition-colors hover:text-ink">Features</a>
          <a href="#how" className="transition-colors hover:text-ink">How it works</a>
          <a href="#privacy" className="transition-colors hover:text-ink">Privacy</a>
        </nav>
        <Link
          to="/app"
          className="inline-flex items-center rounded-full border border-edge bg-card px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-card-hover"
        >
          Open app
        </Link>
      </div>
    </header>
  );
}
