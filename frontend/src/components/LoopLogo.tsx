// Lime square with a loop arrow, plus the "Loop" word.
export function LoopIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4h-4" />
    </svg>
  )
}

export function LoopLogo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-bg">
        <LoopIcon />
      </span>
      <span className="font-heading text-xl font-bold tracking-tight">Loop</span>
    </span>
  )
}
