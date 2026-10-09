import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getProgress, type Progress } from '../api/progress'

// XP, level and streak, shared by the nav XP pill and the Today page,
// so both update together after "Clear it".
type ProgressState = { progress: Progress | null; refresh: () => Promise<void> }

const ProgressContext = createContext<ProgressState | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress | null>(null)

  const refresh = useCallback(async () => {
    try {
      setProgress(await getProgress())
    } catch {
      // keep the old numbers if the call fails
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return <ProgressContext.Provider value={{ progress, refresh }}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressState {
  const value = useContext(ProgressContext)
  if (!value) throw new Error('useProgress must be used inside <ProgressProvider>')
  return value
}
