import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInAdmin } from '../lib/api.js'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setError('')

    try {
      await signInAdmin(form)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message || 'Unable to login')
    } finally {
      setStatus('idle')
    }
  }

  return (
    <main className="page">
      <section className="card narrow">
        <div className="card-header">
          <p className="pill">Admin access</p>
          <h1>Sign in</h1>
          <p className="muted">Use your admin credentials to manage games.</p>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="admin@capextreme.in"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />
          </label>
          {error ? <p className="state error">{error}</p> : null}
          <button className="btn" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <a className="ghost-link" href="/">
          Back to leaderboard
        </a>
      </section>
    </main>
  )
}
