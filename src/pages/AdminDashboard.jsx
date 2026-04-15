import { useEffect, useMemo, useState } from 'react'
import {
  createGame,
  createScore,
  deleteGame,
  deleteScore,
  fetchAdminProfile,
  fetchGames,
  fetchScores,
  signOutAdmin,
  updateGame,
} from '../lib/api.js'
import { supabase } from '../lib/supabaseClient.js'

export default function AdminDashboard() {
  const teamNames = [
    'Code Squad',
    'Aivigo',
    'Fab Four',
    'Ai Wizards',
    'Bratz',
    'Hackstorm',
    'InnoForge',
    'A4 TechSentinels',
    'Code Spheres',
    'TriCode',
    'TwinForge',
    'HackHive',
    'Pixel Pirates',
    'Cloud Crusaders',
    'QUANTUM CODERS',
    'Trisul Vyuh',
    'ByteBlazers',
    'Alt+F4',
    'RaMeXa',
    'Idea Igniters',
    'LogicBlaze',
    'Sparkshift',
    'BrahMos',
    'Profit.exe',
    'Hive Minds',
    'PENTA TITANS',
    'Buffering brains',
    'TechPulse',
  ]
  const [session, setSession] = useState(null)
  const [adminStatus, setAdminStatus] = useState('checking')
  const [games, setGames] = useState([])
  const [scores, setScores] = useState([])
  const [status, setStatus] = useState('loading')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [gameForm, setGameForm] = useState({ name: '', total_marks: '' })
  const [scoreForm, setScoreForm] = useState({
    user_name: '',
    game_id: '',
    marks: '',
  })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', total_marks: '' })

  const groupedScores = useMemo(() => {
    const map = new Map()
    scores.forEach((score) => {
      const key = score.game_id || score.game_name || 'unknown'
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: score.game_name || 'Unknown game',
          total_marks: score.total_marks,
          items: [],
        })
      }
      map.get(key).items.push(score)
    })

    const ordered = []
    games.forEach((game) => {
      if (map.has(game.id)) {
        ordered.push(map.get(game.id))
        map.delete(game.id)
      }
    })

    map.forEach((value) => ordered.push(value))

    return ordered
  }, [games, scores])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session || null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return
        setSession(nextSession)
      },
    )

    return () => {
      active = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.email) return
    setAdminStatus('checking')
    fetchAdminProfile(session.user.email)
      .then((admin) => {
        setAdminStatus(admin ? 'allowed' : 'denied')
      })
      .catch(() => {
        setAdminStatus('denied')
      })
  }, [session])

  useEffect(() => {
    if (!session || adminStatus !== 'allowed') return
    fetchGames()
      .then((data) => {
        setGames(data || [])
        setStatus('ready')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [session, adminStatus])

  useEffect(() => {
    if (!session || adminStatus !== 'allowed') return
    fetchScores()
      .then((data) => {
        setScores(data || [])
      })
      .catch(() => {
        setError('Unable to load participants.')
      })
  }, [session, adminStatus])

  const gamesEmpty = useMemo(() => games.length === 0, [games])
  const hasDuplicateScore = useMemo(() => {
    if (!scoreForm.user_name || !scoreForm.game_id) return false
    const normalizedName = scoreForm.user_name.trim().toLowerCase()
    return scores.some(
      (score) =>
        score.game_id === scoreForm.game_id &&
        score.user_name?.trim().toLowerCase() === normalizedName,
    )
  }, [scoreForm.user_name, scoreForm.game_id, scores])

  const handleGameChange = (event) => {
    const { name, value } = event.target
    setGameForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleScoreChange = (event) => {
    const { name, value } = event.target
    setScoreForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateGame = async (event) => {
    event.preventDefault()
    setNotice('')
    setError('')

    try {
      const payload = {
        name: gameForm.name.trim(),
        total_marks: Number(gameForm.total_marks),
      }
      const created = await createGame(payload)
      setGames((prev) => [created, ...prev])
      setGameForm({ name: '', total_marks: '' })
      setNotice('Game added successfully.')
    } catch (err) {
      setError(err.message || 'Unable to add game.')
    }
  }

  const handleCreateScore = async (event) => {
    event.preventDefault()
    setNotice('')
    setError('')

    try {
      if (hasDuplicateScore) {
        setError('Score already recorded for this team and game.')
        return
      }

      const selectedGame = games.find((game) => game.id === scoreForm.game_id)
      if (!selectedGame) {
        setError('Please select a valid game.')
        return
      }

      const marksValue = Number(scoreForm.marks)
      if (marksValue > selectedGame.total_marks) {
        setError(`Marks cannot exceed total (${selectedGame.total_marks}).`)
        return
      }

      const payload = {
        user_name: scoreForm.user_name.trim(),
        game_id: scoreForm.game_id,
        marks: marksValue,
      }
      await createScore(payload)
      const refreshedScores = await fetchScores()
      setScores(refreshedScores || [])
      setScoreForm({ user_name: '', game_id: '', marks: '' })
      setNotice('Score recorded.')
    } catch (err) {
      setError(err.message || 'Unable to record score.')
    }
  }

  const handleEditStart = (game) => {
    setEditingId(game.id)
    setEditForm({ name: game.name, total_marks: String(game.total_marks) })
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditForm({ name: '', total_marks: '' })
  }

  const handleEditSave = async (gameId) => {
    setNotice('')
    setError('')

    try {
      const payload = {
        name: editForm.name.trim(),
        total_marks: Number(editForm.total_marks),
      }
      const updated = await updateGame(gameId, payload)
      setGames((prev) => prev.map((g) => (g.id === gameId ? updated : g)))
      setNotice('Game updated.')
      handleEditCancel()
    } catch (err) {
      setError(err.message || 'Unable to update game.')
    }
  }

  const handleDeleteGame = async (gameId) => {
    const confirmed = window.confirm('Delete this game? Scores will be removed.')
    if (!confirmed) return

    setNotice('')
    setError('')

    try {
      await deleteGame(gameId)
      setGames((prev) => prev.filter((g) => g.id !== gameId))
      setNotice('Game deleted.')
    } catch (err) {
      setError(err.message || 'Unable to delete game.')
    }
  }

  const handleDeleteParticipant = async (scoreId) => {
    const confirmed = window.confirm('Delete this participant score?')
    if (!confirmed) return

    setNotice('')
    setError('')

    try {
      await deleteScore(scoreId)
      setScores((prev) => prev.filter((score) => score.id !== scoreId))
      setNotice('Participant removed.')
    } catch (err) {
      setError(err.message || 'Unable to delete participant.')
    }
  }

  if (!session) {
    return (
      <main className="page">
        <section className="card narrow">
          <h1>Admin session required</h1>
          <p className="muted">Please login to continue.</p>
          <a className="btn" href="/admin">
            Go to login
          </a>
        </section>
      </main>
    )
  }

  if (adminStatus === 'checking') {
    return (
      <main className="page">
        <section className="card narrow">
          <h1>Checking admin access</h1>
          <p className="muted">Verifying your account.</p>
        </section>
      </main>
    )
  }

  if (adminStatus !== 'allowed') {
    return (
      <main className="page">
        <section className="card narrow">
          <h1>Admin access needed</h1>
          <p className="muted">Your account is not listed as an admin.</p>
          <button className="btn" type="button" onClick={signOutAdmin}>
            Sign out
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="hero-card">
        <div>
          <p className="pill">Admin workspace</p>
          <h1>Manage leaderboard</h1>
          <p className="hero-subtitle">
            Add new games, then capture scores as the events unfold.
          </p>
        </div>
        <div className="hero-metrics">
          <div>
            <span>Games</span>
            <strong>{games.length}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{status === 'ready' ? 'Live' : 'Syncing'}</strong>
          </div>
          <div>
            <span>Portal</span>
            <strong>Admin</strong>
          </div>
        </div>
      </header>

      <div className="leaderboard-header">
        <span className="muted">Signed in as {session.user.email}</span>
        <button className="ghost-link" type="button" onClick={signOutAdmin}>
          Sign out
        </button>
      </div>

      <div className="admin-grid">
        <section className="card">
          <h2>Add game</h2>
          <p className="muted">Create a new game and set its total marks.</p>
          <form className="form" onSubmit={handleCreateGame}>
            <label>
              Game name
              <input
                type="text"
                name="name"
                value={gameForm.name}
                onChange={handleGameChange}
                required
                placeholder="Valorant Finals"
              />
            </label>
            <label>
              Total marks
              <input
                type="number"
                name="total_marks"
                min="1"
                value={gameForm.total_marks}
                onChange={handleGameChange}
                required
                placeholder="100"
              />
            </label>
            <button className="btn" type="submit">Add game</button>
          </form>
        </section>

        <section className="card">
          <h2>Edit games</h2>
          <p className="muted">Update totals or remove games.</p>
          {gamesEmpty && <p className="state">No games to edit yet.</p>}
          {!gamesEmpty && (
            <div className="game-list">
              {games.map((game) => (
                <div className="game-item" key={game.id}>
                  {editingId === game.id ? (
                    <div className="game-edit">
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        placeholder="Game name"
                      />
                      <input
                        type="number"
                        name="total_marks"
                        min="1"
                        value={editForm.total_marks}
                        onChange={handleEditChange}
                        placeholder="Total marks"
                      />
                      <div className="game-actions">
                        <button
                          className="btn"
                          type="button"
                          onClick={() => handleEditSave(game.id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={handleEditCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <strong>{game.name}</strong>
                        <p className="muted">Total marks: {game.total_marks}</p>
                      </div>
                      <div className="game-actions">
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => handleEditStart(game)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => handleDeleteGame(game.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>Record score</h2>
          <p className="muted">Assign player marks for a selected game.</p>
          <form className="form" onSubmit={handleCreateScore}>
            <label>
              Player name
              <select
                name="user_name"
                value={scoreForm.user_name}
                onChange={handleScoreChange}
                required
              >
                <option value="" disabled>
                  Select team
                </option>
                {teamNames.map((team) => (
                  <option value={team} key={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Game
              <select
                name="game_id"
                value={scoreForm.game_id}
                onChange={handleScoreChange}
                required
              >
                <option value="" disabled>
                  Select game
                </option>
                {games.map((game) => (
                  <option value={game.id} key={game.id}>
                    {game.name} ({game.total_marks} pts)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Marks
              <input
                type="number"
                name="marks"
                min="0"
                value={scoreForm.marks}
                onChange={handleScoreChange}
                required
                placeholder="78"
              />
            </label>
            <button
              className="btn"
              type="submit"
              disabled={gamesEmpty || hasDuplicateScore}
            >
              {gamesEmpty
                ? 'Add a game first'
                : hasDuplicateScore
                  ? 'Score already recorded'
                  : 'Record score'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Participants</h2>
          <p className="muted">Review and remove participant scores.</p>
          {scores.length === 0 && (
            <p className="state">No participant scores yet.</p>
          )}
          {scores.length > 0 && (
            <div className="score-groups">
              {groupedScores.map((group) => (
                <div className="score-group" key={group.id}>
                  <div className="score-group-title">
                    <span>{group.name}</span>
                    {group.total_marks != null && (
                      <span className="muted">Total {group.total_marks}</span>
                    )}
                  </div>
                  <div className="score-list">
                    {group.items.map((score) => (
                      <div className="score-item" key={score.id}>
                        <div>
                          <strong>{score.user_name}</strong>
                          <p className="muted">
                            {score.marks} / {score.total_marks}
                          </p>
                        </div>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => handleDeleteParticipant(score.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {notice ? <p className="state success">{notice}</p> : null}
      {error ? <p className="state error">{error}</p> : null}
    </main>
  )
}
