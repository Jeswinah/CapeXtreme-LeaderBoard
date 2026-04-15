import { useEffect, useMemo, useState } from 'react'
import { fetchLeaderboard } from '../lib/api.js'
import { supabase } from '../lib/supabaseClient.js'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Leaderboard() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('total')

  useEffect(() => {
    let active = true

    const loadLeaderboard = () => {
      setStatus('loading')
      fetchLeaderboard()
        .then((data) => {
          if (!active) return
          setRows(data || [])
          setStatus('ready')
        })
        .catch((err) => {
          if (!active) return
          setError(err.message || 'Unable to load leaderboard')
          setStatus('error')
        })
    }

    loadLeaderboard()

    const channel = supabase
      .channel('leaderboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_scores' },
        () => loadLeaderboard(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        () => loadLeaderboard(),
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  const summary = useMemo(() => {
    const totalPlayers = new Set(rows.map((row) => row.user_name)).size
    const totalGames = new Set(rows.map((row) => row.game_name)).size
    return { totalPlayers, totalGames }
  }, [rows])

  const games = useMemo(() => {
    const map = new Map()
    rows.forEach((row) => {
      if (!row.game_name) return
      const key = row.game_id || row.game_name
      if (!map.has(key)) {
        map.set(key, {
          id: row.game_id || row.game_name,
          name: row.game_name,
          total_marks: row.total_marks,
        })
      }
    })
    return Array.from(map.values())
  }, [rows])

  const totals = useMemo(() => {
    const map = new Map()
    rows.forEach((row) => {
      if (!row.user_name) return
      const current = map.get(row.user_name) || {
        user_name: row.user_name,
        totalScore: 0,
        games: new Set(),
      }
      current.totalScore += row.marks || 0
      if (row.game_name) {
        current.games.add(row.game_name)
      }
      map.set(row.user_name, current)
    })

    return Array.from(map.values())
      .map((entry) => ({
        user_name: entry.user_name,
        totalScore: entry.totalScore,
        games: entry.games.size,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))
  }, [rows])

  const gameRows = useMemo(() => {
    if (activeTab === 'total') return []
    return rows
      .filter((row) => (row.game_id || row.game_name) === activeTab)
      .sort((a, b) => (b.marks || 0) - (a.marks || 0))
      .map((row, index) => ({ ...row, rank: index + 1 }))
  }, [activeTab, rows])

  return (
    <main className="page">
      <header className="hero-card">
        <div>
          <p className="pill">CapeXtreme League</p>
          <h1>Live Leaderboard</h1>
          
        </div>
        <div className="hero-metrics">
          <div>
            <span>Teams </span>
            <strong>{summary.totalPlayers}</strong>
          </div>
          <div>
            <span>Games</span>
            <strong>{summary.totalGames}</strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>{rows[0]?.created_at ? formatDate(rows[0].created_at) : '—'}</strong>
          </div>
        </div>
      </header>

      <section className="leaderboard">
        <div className="leaderboard-header">
          <h2>Leaderboard</h2>
          <div className="tab-list" role="tablist">
            <button
              type="button"
              className={`tab ${activeTab === 'total' ? 'active' : ''}`}
              onClick={() => setActiveTab('total')}
            >
              Total Score
            </button>
            {games.map((game) => (
              <button
                type="button"
                key={game.id}
                className={`tab ${activeTab === game.id ? 'active' : ''}`}
                onClick={() => setActiveTab(game.id)}
              >
                {game.name}
              </button>
            ))}
          </div>
        </div>

        {status === 'loading' && (
          <div className="state">Loading leaderboard…</div>
        )}
        {status === 'error' && (
          <div className="state error">{error}</div>
        )}
        {status === 'ready' && rows.length === 0 && (
          <div className="state">No scores yet. Check back soon.</div>
        )}

        {status === 'ready' && rows.length > 0 && activeTab === 'total' && (
          <div className="table table-total">
            <div className="table-row table-head">
              <span className="rank he">#</span>
              <span className='he'>Team Name</span>
              <span className='he'>Games</span>
              <span className='he'>Total Score</span>
            </div>
            {totals.map((entry) => (
              <div
                className={`table-row rank-${entry.rank}`}
                key={entry.user_name}
              >
                <span className="rank ">{entry.rank}</span>
                <span className="player">
                  {entry.user_name}
                </span>
                <span>{entry.games}</span>
                <span className="score">{entry.totalScore} pts</span>
              </div>
            ))}
          </div>
        )}

        {status === 'ready' && rows.length > 0 && activeTab !== 'total' && (
          <div className="table table-game">
            <div className="table-row table-head">
              <span className="rank he">#</span>
              <span className='he'>Team Name</span>
              <span className='he'>Score</span>
              <span className='he'>Total</span>
            </div>
            {gameRows.map((row) => (
              <div
                className={`table-row rank-${row.rank}`}
                key={row.id}
              >
                <span className="rank">{row.rank}</span>
                <span className="player">
                  {row.user_name}
                 
                </span>
                <span className="score">{row.marks} pts</span>
                <span className='he'>{row.total_marks} pts</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
