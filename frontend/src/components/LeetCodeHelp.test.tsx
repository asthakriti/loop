import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LEETCODE_EXPORT_SCRIPT } from '../leetcodeExport'
import { LeetCodeHelp } from './LeetCodeHelp'

describe('LeetCode export help', () => {
  it('the script is valid JavaScript and asks only for solved problems', () => {
    expect(() => new Function(LEETCODE_EXPORT_SCRIPT)).not.toThrow()
    expect(LEETCODE_EXPORT_SCRIPT).toContain("status: 'AC'")
    expect(LEETCODE_EXPORT_SCRIPT).toContain("'slug,title,link,difficulty'")
    expect(LEETCODE_EXPORT_SCRIPT).toContain("fetch('/graphql'") // same site only, nothing sent elsewhere
  })

  it('is open on first visit and shows the steps', () => {
    render(<LeetCodeHelp open />)
    expect(screen.getByText('How to get your solved list from LeetCode').closest('details')).toHaveAttribute('open')
    expect(screen.getByRole('link', { name: 'leetcode.com' })).toHaveAttribute('href', 'https://leetcode.com')
    expect(screen.getByText('leetcode_solved.csv')).toBeInTheDocument()
  })

  it('is closed when the user already has problems', () => {
    render(<LeetCodeHelp open={false} />)
    expect(screen.getByText('How to get your solved list from LeetCode').closest('details')).not.toHaveAttribute('open')
  })

  it('copies the script', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<LeetCodeHelp open />)
    await user.click(screen.getByRole('button', { name: 'Copy script' }))
    expect(writeText).toHaveBeenCalledWith(LEETCODE_EXPORT_SCRIPT)
    expect(await screen.findByRole('button', { name: 'Copied ✓' })).toBeInTheDocument()
  })

  it('shows the script when the clipboard is blocked', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('blocked'))
    render(<LeetCodeHelp open />)
    await user.click(screen.getByRole('button', { name: 'Copy script' }))
    expect(await screen.findByText(/questionList/)).toBeInTheDocument()
  })
})
