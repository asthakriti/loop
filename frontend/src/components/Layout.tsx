import { Outlet } from 'react-router-dom'
import { ProgressProvider } from '../state/ProgressContext'
import { BottomTabs } from './BottomTabs'
import { Nav } from './Nav'

export function Layout() {
  return (
    <ProgressProvider>
      <Nav />
      <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-6 md:pb-8 md:pt-8">
        <Outlet />
      </main>
      <BottomTabs />
    </ProgressProvider>
  )
}
