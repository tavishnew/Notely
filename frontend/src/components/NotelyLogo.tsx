import { motion } from "framer-motion";

export function NotelyLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 40 40"
      className={className}
      initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 16 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="notely-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--sunrise)" />
          <stop offset="100%" stopColor="var(--butter)" />
        </linearGradient>
      </defs>
      <rect x="6" y="4" width="26" height="32" rx="6" fill="url(#notely-g)" />
      <rect x="10" y="4" width="2" height="32" fill="var(--ink)" opacity="0.25" />
      <path
        d="M15 14h12M15 20h12M15 26h8"
        stroke="var(--ink)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}