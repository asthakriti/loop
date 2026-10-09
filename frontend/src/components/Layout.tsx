import { Outlet } from 'react-router-dom'
import { Nav } from './Nav'

export function Layout() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <Outlet />
      </main>
    </>
  )
}
