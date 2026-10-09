import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Bank } from './pages/Bank'
import { Login } from './pages/Login'
import { MyProblems } from './pages/MyProblems'
import { Patterns } from './pages/Patterns'
import { Settings } from './pages/Settings'
import { Today } from './pages/Today'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Everything below needs login. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Today />} />
          <Route path="/problems" element={<MyProblems />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/patterns" element={<Patterns />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
