import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
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

export default function Landing() {
  const reduce = useReducedMotion();
  const fadeUp = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-paper opacity-40" />
        <div
          className="absolute -top-32 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--butter), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-28 text-center md:pt-32 md:pb-36">
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl"
          >
            Turn anything into <br className="hidden md:block" />
            notes you actually remember.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            Drop in a YouTube link, a PDF, a lecture recording or a webpage.
            Notely writes the notes, makes the flashcards, and reads it back
            as a podcast.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.2 }}
            className="mt-9 flex items-center justify-center"
          >
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.02]"
            >
              Start taking notes
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mb-14 max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl"
        >
          One workspace. Every way to study.
        </motion.h2>

        <BentoGrid />
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center font-display text-4xl font-bold tracking-tight md:text-5xl"
          >
            From source to studied in three steps.
          </motion.h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Drop it in", d: "Paste a link, upload a PDF, or record audio right in the app." },
              { n: "02", t: "Notely reads it", d: "We transcribe, chunk, and structure your material into clean notes." },
              { n: "03", t: "You remember it", d: "Flashcards, quizzes and podcast recaps "” tuned to what you keep missing." },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-3xl border border-border bg-card p-8 shadow-sm"
              >
                <div className="font-display text-5xl font-bold text-primary/40">{step.n}</div>
                <h3 className="mt-4 font-display text-2xl font-bold">{step.t}</h3>
                <p className="mt-2 text-muted-foreground">{step.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section id="privacy" className="mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] border border-border bg-foreground p-10 text-background md:p-16"
        >
          <div
            className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "var(--sunrise)" }}
          />
          <div className="relative grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-background/20 px-3 py-1 text-xs font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Local-first & private
              </div>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
                Your notes never leave your machine unless you say so.
              </h2>
              <p className="mt-4 max-w-xl text-background/70">
                Notely runs local models by default and stores everything in your
                browser "” no accounts, no trackers, no lock-in.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                "Local Ollama or your own API key",
                "End-to-end offline mode",
                "Open source (AGPL)",
                "Export to Markdown anytime",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 rounded-2xl border border-background/15 bg-background/5 px-4 py-3">
                  <Check className="h-4 w-4 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

function BentoGrid() {
  const cell = "group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg md:p-8";
  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ staggerChildren: 0.08 }}
      className="grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-5 md:grid-cols-6"
    >
      {/* Big: AI notes */}
      <motion.div variants={item} className={`${cell} md:col-span-4 md:row-span-2`}>
        <div className="flex h-full flex-col justify-between">
          <div>
            <BrainCircuit className="h-7 w-7 text-primary" />
            <h3 className="mt-4 font-display text-2xl font-bold">Notes that write themselves</h3>
            <p className="mt-2 max-w-md text-muted-foreground">
              Structured outlines, headings, and key takeaways "” extracted from any
              source in seconds, editable like a real doc.
            </p>
          </div>
          <NotesMock />
        </div>
      </motion.div>

      {/* Flashcards */}
      <motion.div variants={item} className={`${cell} md:col-span-2`}>
        <Layers className="h-6 w-6 text-primary" />
        <h3 className="mt-3 font-display text-xl font-bold">Smart flashcards</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-generated. Spaced repetition. Actually fun.
        </p>
        <FlashcardMock />
      </motion.div>

      {/* Podcast */}
      <motion.div variants={item} className={`${cell} md:col-span-2`}>
        <Headphones className="h-6 w-6 text-primary" />
        <h3 className="mt-3 font-display text-xl font-bold">Podcast recaps</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Notely reads your notes back to you on the commute.
        </p>
        <WaveMock />
      </motion.div>

      {/* Assistant */}
      <motion.div variants={item} className={`${cell} md:col-span-3`}>
        <MessageSquare className="h-6 w-6 text-primary" />
        <h3 className="mt-3 font-display text-xl font-bold">Ask your notes anything</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A chat assistant grounded in your library "” with citations.
        </p>
        <ChatMock />
      </motion.div>

      {/* Quizzes */}
      <motion.div variants={item} className={`${cell} md:col-span-3`}>
        <Check className="h-6 w-6 text-primary" />
        <h3 className="mt-3 font-display text-xl font-bold">Adaptive quizzes</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We track what you miss and quiz you on it again "” until you don't.
        </p>
        <QuizMock />
      </motion.div>
    </motion.div>
  );
}

function NotesMock() {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-butter" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-2/3 rounded bg-foreground/80" />
        <div className="h-2 w-full rounded bg-muted" />
        <div className="h-2 w-11/12 rounded bg-muted" />
        <div className="h-2 w-9/12 rounded bg-muted" />
        <div className="mt-3 flex gap-2">
          <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">key</span>
          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">source</span>
        </div>
        <div className="h-2 w-10/12 rounded bg-muted" />
        <div className="h-2 w-7/12 rounded bg-muted" />
      </div>
    </div>
  );
}

function FlashcardMock() {
  return (
    <motion.div
      whileHover={{ rotateY: 12, rotateX: -4 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      style={{ transformStyle: "preserve-3d" }}
      className="mt-5 rounded-2xl border border-border bg-background p-4 shadow-inner"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Card 3 / 12
      </div>
      <div className="mt-2 font-display text-base font-semibold">
        What is spaced repetition?
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 rounded-full bg-primary" />
      </div>
    </motion.div>
  );
}

function WaveMock() {
  return (
    <div className="mt-5 flex h-16 items-end gap-1">
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-primary/70"
          animate={{ height: ["25%", `${30 + ((i * 37) % 60)}%`, "25%"] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
          style={{ height: "25%" }}
        />
      ))}
    </div>
  );
}

function ChatMock() {
  return (
    <div className="mt-5 space-y-2">
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        Summarize chapter 4 in 3 bullets
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm">
        Sure "” pulling from your PDF and the lecture recording"..
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
          className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <span>{q.t}</span>
          <span
            className={`ml-3 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              q.ok
                ? "bg-primary/15 text-primary"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {q.ok ? "correct" : "review"}
          </span>
        </div>
      ))}
    </div>
  );
}

