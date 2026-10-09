import { useEffect, useState, type FormEvent } from 'react'
import { COMPANIES } from '../api/constants'
import { getSettings, saveSettings } from '../api/settings'
import { getStats } from '../api/stats'
import { ToastList, useToasts } from '../components/Toasts'

// Same limits as the backend (PUT /settings).
const LIMITS = {
  round_days: { min: 7, max: 90 },
  max_daily: { min: 1, max: 30 },
  new_per_day: { min: 0, max: 5 },
} as const
type NumberField = keyof typeof LIMITS

type Form = Record<NumberField, string> & { target_company: string }

/** Returns an error message for each number that is missing or out of range. */
export function validate(form: Form): Partial<Record<NumberField, string>> {
  const errors: Partial<Record<NumberField, string>> = {}
  for (const field of Object.keys(LIMITS) as NumberField[]) {
    const { min, max } = LIMITS[field]
    const value = Number(form[field])
    if (form[field].trim() === '' || !Number.isInteger(value) || value < min || value > max) {
      errors[field] = `Use a whole number from ${min} to ${max}.`
    }
  }
  return errors
}

type FieldProps = {
  field: NumberField
  label: string
  help: string
  form: Form
  error?: string
  onChange: (field: NumberField, value: string) => void
}

function NumberInput({ field, label, help, form, error, onChange }: FieldProps) {
  const { min, max } = LIMITS[field]
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={field} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={field}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={form[field]}
        onChange={(e) => onChange(field, e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={`${field}-help`}
        className={`h-11 w-full rounded-btn border bg-bg px-3 font-mono outline-none focus:border-accent sm:w-40 ${error ? 'border-coral' : 'border-border-strong'}`}
      />
      <p id={`${field}-help`} className={`text-xs ${error ? 'text-coral' : 'text-muted'}`}>
        {error ?? `${help} (${min}–${max})`}
      </p>
    </div>
  )
}

export function Settings() {
  const [form, setForm] = useState<Form | null>(null)
  const [lineSize, setLineSize] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const { toasts, push } = useToasts()

  useEffect(() => {
    Promise.all([getSettings(), getStats()])
      .then(([s, stats]) => {
        setForm({
          round_days: String(s.round_days),
          max_daily: String(s.max_daily),
          new_per_day: String(s.new_per_day),
          target_company: s.target_company ?? '',
        })
        setLineSize(stats.round.total)
      })
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  if (loadError) {
    return (
      <p role="alert" className="text-coral">
        {loadError}
      </p>
    )
  }
  if (!form) return <p className="text-muted">Loading settings…</p>

  const errors = validate(form)
  const roundDays = Number(form.round_days)
  // Live preview of the round robin: ceil(problems in the line / round days).
  const perDay = !errors.round_days && lineSize > 0 ? Math.ceil(lineSize / roundDays) : null

  function update(field: NumberField | 'target_company', value: string) {
    setForm((f) => f && { ...f, [field]: value })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form || Object.keys(validate(form)).length > 0) return
    setSaving(true)
    try {
      await saveSettings({
        round_days: Number(form.round_days),
        max_daily: Number(form.max_daily),
        new_per_day: Number(form.new_per_day),
        target_company: form.target_company || null,
      })
      push('Settings saved', 'win')
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not save.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted">Tune the loop to your pace.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6">
        <div>
          <NumberInput field="round_days" label="Round length (days)" help="Every problem comes back once in this many days" form={form} error={errors.round_days} onChange={update} />
          {perDay !== null && (
            <p className="mt-2 rounded-btn border border-lavender/30 bg-lavender/10 px-3 py-2 text-sm text-lavender">
              {lineSize} problems in your line → {perDay} per day
            </p>
          )}
        </div>
        <NumberInput field="max_daily" label="Daily limit" help="Warn me when a day has more loop problems than this" form={form} error={errors.max_daily} onChange={update} />
        <NumberInput field="new_per_day" label="New problems per day" help="How many new quests to suggest each day" form={form} error={errors.new_per_day} onChange={update} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="target_company" className="text-sm font-medium">
            Target company
          </label>
          <select
            id="target_company"
            value={form.target_company}
            onChange={(e) => update('target_company', e.target.value)}
            className="h-11 w-full rounded-btn border border-border-strong bg-bg px-3 outline-none focus:border-accent sm:w-64"
          >
            <option value="">None</option>
            {COMPANIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">Its problems get +3 priority in suggestions.</p>
        </div>

        <button
          type="submit"
          disabled={saving || Object.keys(errors).length > 0}
          className="h-11 self-start rounded-btn bg-accent px-6 font-heading font-semibold text-bg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <ToastList toasts={toasts} />
    </div>
  )
}
