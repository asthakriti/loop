import { useEffect, useState } from 'react'
import { getByte, type ByteType, type DailyByte as Byte } from '../api/byte'

// One line of Python, with the "# comment" part dimmer.
function CodeLine({ line }: { line: string }) {
  const hash = line.indexOf('#')
  if (hash === -1) return <>{line || ' '}</>
  return (
    <>
      {line.slice(0, hash)}
      <span className="text-muted/70">{line.slice(hash)}</span>
    </>
  )
}

export function DailyByte() {
  const [type, setType] = useState<ByteType>('code')
  const [offset, setOffset] = useState(0) // 0 = today's byte, the Next button adds 1
  const [byte, setByte] = useState<Byte | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getByte(type, offset)
      .then((b) => {
        if (active) {
          setByte(b)
          setError('')
        }
      })
      .catch((e: Error) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [type, offset])

  function switchType(next: ByteType) {
    setType(next)
    setOffset(0)
  }

  const tab = (value: ByteType, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={type === value}
      onClick={() => switchType(value)}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${type === value ? 'bg-byte-border text-text' : 'text-muted hover:text-text'}`}
    >
      {label}
    </button>
  )

  return (
    <section aria-labelledby="byte-heading" className="flex h-full flex-col rounded-card border border-byte-border bg-byte-bg p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="byte-heading" className="font-mono text-xs uppercase tracking-widest text-lavender">
          Daily Byte
        </h2>
        <div role="tablist" aria-label="Byte type" className="flex gap-1 rounded-btn border border-byte-border p-1">
          {tab('code', 'Code')}
          {tab('fact', 'Fact')}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-coral">{error}</p>}

      {byte && (
        <>
          <h3 className="mt-4 text-xl font-semibold">{byte.title}</h3>
          {byte.topic && <p className="mt-1 text-sm text-muted">{byte.topic}</p>}

          {byte.type === 'code' ? (
            <pre className="mt-4 overflow-x-auto rounded-btn bg-byte-code p-4 font-mono text-[13px] leading-6">
              <code>
                {byte.content.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-7 shrink-0 select-none pr-3 text-right text-muted/50">{i + 1}</span>
                    <span className="whitespace-pre">
                      <CodeLine line={line} />
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          ) : (
            <p className="mt-4 rounded-btn bg-byte-code p-4 leading-relaxed">{byte.content}</p>
          )}

          <p className="mt-4 text-sm">
            <span className="font-medium text-lavender">Why it matters: </span>
            <span className="text-text/90">{byte.why_it_matters}</span>
          </p>
        </>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <p className="font-mono text-xs text-muted">A new byte every morning</p>
        <button
          type="button"
          onClick={() => setOffset((o) => o + 1)}
          className="h-11 rounded-btn border border-byte-border px-4 text-sm hover:bg-byte-border"
        >
          Next
        </button>
      </div>
    </section>
  )
}
