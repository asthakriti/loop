import { NavLink } from 'react-router-dom'
import { LoopArrowIcon, SparkIcon, SunIcon, TargetIcon } from './icons'

const TABS = [
  { to: '/', label: 'Today', icon: <SunIcon size={20} /> },
  { to: '/problems', label: 'Problems', icon: <LoopArrowIcon size={20} /> },
  { to: '/patterns', label: 'Patterns', icon: <SparkIcon size={20} /> },
  { to: '/settings', label: 'Settings', icon: <TargetIcon size={20} /> },
]

// Phone only: the top nav links are hidden on small screens, so these tabs replace them.
export function BottomTabs() {
  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-xs ${isActive ? 'text-accent' : 'text-muted'}`
              }
            >
              {tab.icon}
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
