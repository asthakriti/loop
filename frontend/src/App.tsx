import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ComingSoon } from './pages/ComingSoon'
import { Login } from './pages/Login'
import { Today } from './pages/Today'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Everything below needs login. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Today />} />
          <Route path="/problems" element={<ComingSoon title="My problems" feature={14} />} />
          <Route path="/bank" element={<ComingSoon title="Problem bank" feature={14} />} />
          <Route path="/patterns" element={<ComingSoon title="Patterns" feature={15} />} />
          <Route path="/settings" element={<ComingSoon title="Settings" feature={15} />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
