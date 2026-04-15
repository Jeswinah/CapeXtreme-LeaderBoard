import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import Leaderboard from './pages/Leaderboard.jsx'

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
