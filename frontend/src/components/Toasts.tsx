import { useCallback, useRef, useState } from 'react'

export type ToastKind = 'xp' | 'badge' | 'error' | 'win'
type Toast = { id: number; text: string; kind: ToastKind }

const STYLE: Record<ToastKind, string> = {
  xp: 'border-lavender/40 text-lavender',
  badge: 'border-amber/40 text-amber',
  win: 'border-accent/40 text-accent',
  error: 'border-coral/40 text-coral',
}

/** Small pop-up messages that go away after a few seconds. */
export function useToasts(durationMs = 3500) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const push = useCallback(
    (text: string, kind: ToastKind = 'xp') => {
      const id = nextId.current++
      setToasts((list) => [...list, { id, text, kind }])
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), durationMs)
    },
    [durationMs],
  )

  return { toasts, push }
}

export function ToastList({ toasts }: { toasts: Toast[] }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-24 right-4 z-50 md:bottom-6 md:right-6 flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`rounded-btn border bg-surface px-4 py-2.5 font-mono text-sm shadow-xl ${STYLE[t.kind]}`}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
