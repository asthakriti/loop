import { Outlet } from 'react-router-dom'
import { ProgressProvider } from '../state/ProgressContext'
import { Nav } from './Nav'

export function Layout() {
  return (
    <ProgressProvider>
      <Nav />
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <Outlet />
      </main>
    </ProgressProvider>
  )
}
