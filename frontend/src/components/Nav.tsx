import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { NotelyLogo } from "./NotelyLogo";

export function Nav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <NotelyLogo className="h-8 w-8" />
          <span className="font-display text-xl font-bold tracking-tight">Notely</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#privacy" className="transition-colors hover:text-foreground">Privacy</a>
        </nav>
        <Link
          to="/app"
          className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Open app
        </Link>
      </div>
    </motion.header>
  );
}