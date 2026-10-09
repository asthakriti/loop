import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BottomTabs } from './BottomTabs'

describe('BottomTabs (phone)', () => {
  it('has the four tabs and marks the current page', () => {
    render(
      <MemoryRouter initialEntries={['/patterns']}>
        <BottomTabs />
      </MemoryRouter>,
    )
    const tabs = screen.getByRole('navigation', { name: 'Tabs' })
    const links = within(tabs).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Today', 'Problems', 'Patterns', 'Settings'])
    expect(within(tabs).getByRole('link', { name: 'Patterns' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current')
  })
})
