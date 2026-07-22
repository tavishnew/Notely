import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Layers,
  Headphones,
  MessageSquare,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

type MotionStyle = CSSProperties & Partial<Record<"--enter-delay" | "--wave-height", string>>;

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-paper opacity-40" />
        <div
          className="absolute -top-32 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-butter), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-28 text-center md:pt-32 md:pb-36">
          <h1 className="motion-enter font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            Turn anything into <br className="hidden md:block" />
            notes you actually remember.
          </h1>

          <p
            className="motion-enter mx-auto mt-6 max-w-2xl text-lg text-ink-dim md:text-xl"
            style={{ "--enter-delay": "100ms" } as MotionStyle}
          >
            Drop in a YouTube link, a PDF, a lecture recording or a webpage.
            Notely writes the notes, makes the flashcards, and reads it back
            as a podcast.
          </p>

          <div
            className="motion-enter mt-9 flex items-center justify-center"
            style={{ "--enter-delay": "200ms" } as MotionStyle}
          >
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-transform hover:scale-[1.02]"
            >
              Start taking notes
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="motion-enter mb-14 max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">
          One workspace. Every way to study.
        </h2>

        <BentoGrid />
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-edge/60 bg-card-hover">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="motion-enter mb-14 text-center font-display text-4xl font-bold tracking-tight md:text-5xl">
            From source to studied in three steps.
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Drop it in", d: "Paste a link, upload a PDF, or record audio right in the app." },
              { n: "02", t: "Notely reads it", d: "We transcribe, chunk, and structure your material into clean notes." },
              { n: "03", t: "You remember it", d: "Flashcards, quizzes and podcast recaps — tuned to what you keep missing." },
            ].map((step, i) => (
              <div
                key={step.n}
                className="motion-rise rounded-3xl border border-edge bg-card p-8 shadow-soft"
                style={{ "--enter-delay": `${i * 100}ms` } as MotionStyle}
              >
                <div className="font-display text-5xl font-bold text-accent/40">{step.n}</div>
                <h3 className="mt-4 font-display text-2xl font-bold">{step.t}</h3>
                <p className="mt-2 text-ink-dim">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section id="privacy" className="mx-auto max-w-7xl px-6 py-24">
        <div className="motion-enter relative overflow-hidden rounded-[2rem] border border-edge bg-ink p-10 text-paper md:p-16">
          <div
            className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--color-sunrise)" }}
          />
          <div className="relative grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-3 py-1 text-xs font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Local-first & private
              </div>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
                Your notes never leave your machine unless you say so.
              </h2>
              <p className="mt-4 max-w-xl text-paper/70">
                Notely runs local models by default and stores everything in your
                browser — no accounts, no trackers, no lock-in.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                "Local Ollama or your own API key",
                "End-to-end offline mode",
                "Open source (AGPL)",
                "Export to Markdown anytime",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 rounded-2xl border border-paper/15 bg-paper/5 px-4 py-3">
                  <Check className="h-4 w-4 text-accent" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>


      <Footer />
    </div>
  );
}

function BentoGrid() {
  const cell =
    "motion-rise group relative overflow-hidden rounded-3xl border border-edge bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lg md:p-8";

  return (
    <div className="grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-5 md:grid-cols-6">
      {/* Big: AI notes */}
      <div className={`${cell} md:col-span-4 md:row-span-2`}>
        <div className="flex h-full flex-col justify-between">
          <div>
            <BrainCircuit className="h-7 w-7 text-accent" />
            <h3 className="mt-4 font-display text-2xl font-bold">Notes that write themselves</h3>
            <p className="mt-2 max-w-md text-ink-dim">
              Structured outlines, headings, and key takeaways — extracted from any
              source in seconds, editable like a real doc.
            </p>
          </div>
          <NotesMock />
        </div>
      </div>

      {/* Flashcards */}
      <div className={`${cell} md:col-span-2`} style={{ "--enter-delay": "80ms" } as MotionStyle}>
        <Layers className="h-6 w-6 text-accent" />
        <h3 className="mt-3 font-display text-xl font-bold">Smart flashcards</h3>
        <p className="mt-1 text-sm text-ink-dim">
          Auto-generated. Spaced repetition. Actually fun.
        </p>
        <FlashcardMock />
      </div>

      {/* Podcast */}
      <div className={`${cell} md:col-span-2`} style={{ "--enter-delay": "160ms" } as MotionStyle}>
        <Headphones className="h-6 w-6 text-accent" />
        <h3 className="mt-3 font-display text-xl font-bold">Podcast recaps</h3>
        <p className="mt-1 text-sm text-ink-dim">
          Notely reads your notes back to you on the commute.
        </p>
        <WaveMock />
      </div>

      {/* Assistant */}
      <div className={`${cell} md:col-span-3`} style={{ "--enter-delay": "240ms" } as MotionStyle}>
        <MessageSquare className="h-6 w-6 text-accent" />
        <h3 className="mt-3 font-display text-xl font-bold">Ask your notes anything</h3>
        <p className="mt-1 text-sm text-ink-dim">
          A chat assistant grounded in your library — with citations.
        </p>
        <ChatMock />
      </div>

      {/* Quizzes */}
      <div className={`${cell} md:col-span-3`} style={{ "--enter-delay": "320ms" } as MotionStyle}>
        <Check className="h-6 w-6 text-accent" />
        <h3 className="mt-3 font-display text-xl font-bold">Adaptive quizzes</h3>
        <p className="mt-1 text-sm text-ink-dim">
          We track what you miss and quiz you on it again — until you don't.
        </p>
        <QuizMock />
      </div>
    </div>
  );
}

function NotesMock() {
  return (
    <div className="mt-6 rounded-2xl border border-edge bg-bg p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-danger-soft" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-2/3 rounded bg-ink/80" />
        <div className="h-2 w-full rounded bg-ink-faint" />
        <div className="h-2 w-11/12 rounded bg-ink-faint" />
        <div className="h-2 w-9/12 rounded bg-ink-faint" />
        <div className="mt-3 flex gap-2">
          <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-ink">key</span>
          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">source</span>
        </div>
        <div className="h-2 w-10/12 rounded bg-ink-faint" />
        <div className="h-2 w-7/12 rounded bg-ink-faint" />
      </div>
    </div>
  );
}

function FlashcardMock() {
  return (
    <div className="tilt-card mt-5 rounded-2xl border border-edge bg-bg p-4 shadow-inner transition-transform duration-300">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-dim">
        Card 3 / 12
      </div>
      <div className="mt-2 font-display text-base font-semibold">
        What is spaced repetition?
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-faint">
        <div className="h-full w-1/3 rounded-full bg-accent" />
      </div>
    </div>
  );
}

function WaveMock() {
  return (
    <div className="mt-5 flex h-16 items-end gap-1">
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-accent/70"
          style={{
            "--wave-height": `${30 + ((i * 37) % 60)}%`,
            height: "25%",
            animation: `wave 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.05}s`,
          } as MotionStyle}
        />
      ))}
    </div>
  );
}

function ChatMock() {
  return (
    <div className="mt-5 space-y-2">
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-ink">
        Summarize chapter 4 in 3 bullets
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-card-hover px-3 py-2 text-sm">
        Sure — pulling from your PDF and the lecture recording…
      </div>
    </div>
  );
}

function QuizMock() {
  return (
    <div className="mt-5 space-y-2">
      {[
        { t: "Mitochondria produce ATP.", ok: true },
        { t: "Chlorophyll is red.", ok: false },
        { t: "DNA is double-stranded.", ok: true },
      ].map((q) => (
        <div
          key={q.t}
          className="flex items-center justify-between rounded-xl border border-edge bg-bg px-3 py-2 text-sm"
        >
          <span>{q.t}</span>
          <span
            className={`ml-3 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              q.ok
                ? "bg-accent/15 text-accent"
                : "bg-danger-soft text-danger-ink"
            }`}
          >
            {q.ok ? "correct" : "review"}
          </span>
        </div>
      ))}
    </div>
  );
}
