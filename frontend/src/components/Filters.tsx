import { useEffect, useState } from 'react'

const control =
  'h-11 rounded-btn border border-border-strong bg-surface px-3 text-sm text-text outline-none focus:border-accent'

/** Returns the value only after it stopped changing for `ms` (so search does not fire on every key). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

export function SearchInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-muted">
      {label}
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search by title" className={control} />
    </label>
  )
}

type SelectProps = {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[] | { value: string; label: string }[]
  allLabel?: string
}

export function SelectFilter({ label, value, onChange, options, allLabel = 'All' }: SelectProps) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={control}>
        <option value="">{allLabel}</option>
        {items.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4">{children}</div>
}
