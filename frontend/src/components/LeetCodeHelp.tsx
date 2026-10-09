import { useState } from 'react'
import { LEETCODE_EXPORT_SCRIPT } from '../leetcodeExport'

// Steps to download your solved list from LeetCode, then import it with the "Import CSV" button.
export function LeetCodeHelp({ open }: { open: boolean }) {
  const [copied, setCopied] = useState(false)
  const [showScript, setShowScript] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(LEETCODE_EXPORT_SCRIPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setShowScript(true) // clipboard blocked: show the script so it can be copied by hand
    }
  }

  return (
    <details open={open} className="group rounded-card border border-border bg-surface p-5">
      <summary className="cursor-pointer list-none font-heading font-semibold marker:hidden">
        <span className="mr-2 inline-block text-accent transition-transform group-open:rotate-90">›</span>
        How to get your solved list from LeetCode
      </summary>

      <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-sm text-text/90">
        <li>
          Open{' '}
          <a href="https://leetcode.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            leetcode.com
          </a>{' '}
          and log in.
        </li>
        <li>
          Open the browser console: press <kbd className="rounded border border-border-strong px-1 font-mono text-xs">F12</kbd> (or{' '}
          <kbd className="rounded border border-border-strong px-1 font-mono text-xs">Ctrl+Shift+J</kbd>) and pick the <strong>Console</strong> tab.
        </li>
        <li>
          Click <strong>Copy script</strong> below, paste it in the console and press <strong>Enter</strong>. If Chrome says pasting is blocked, type{' '}
          <code className="font-mono text-xs text-amber">allow pasting</code> first, press Enter, then paste again.
        </li>
        <li>
          A file named <code className="font-mono text-xs">leetcode_solved.csv</code> downloads with every problem you solved.
        </li>
        <li>
          Click <strong>Import CSV</strong> on this page and choose that file. Problems you already have are skipped, so you can do this again any time.
        </li>
      </ol>

      <p className="mt-3 text-xs text-muted">
        The script only reads your own solved list from LeetCode and saves it on your computer. It sends nothing anywhere else.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="h-11 rounded-btn bg-accent px-4 font-heading text-sm font-semibold text-bg hover:opacity-90"
        >
          {copied ? 'Copied ✓' : 'Copy script'}
        </button>
        <button
          type="button"
          onClick={() => setShowScript((s) => !s)}
          aria-expanded={showScript}
          className="h-11 rounded-btn border border-border-strong px-4 text-sm hover:bg-surface-2"
        >
          {showScript ? 'Hide script' : 'Show script'}
        </button>
      </div>

      {showScript && (
        <pre className="mt-4 max-h-80 overflow-auto rounded-btn bg-byte-code p-4 font-mono text-xs leading-5">
          <code>{LEETCODE_EXPORT_SCRIPT}</code>
        </pre>
      )}
    </details>
  )
}
