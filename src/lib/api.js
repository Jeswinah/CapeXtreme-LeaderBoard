import { supabase } from './supabaseClient.js'

export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('game_scores')
    .select('id,user_name,marks,created_at,game:games(id,name,total_marks)')
    .order('marks', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((row, index) => ({
    id: row.id,
    user_name: row.user_name,
    marks: row.marks,
    created_at: row.created_at,
    game_id: row.game?.id,
    game_name: row.game?.name,
    total_marks: row.game?.total_marks,
    rank: index + 1,
  }))
}

export async function fetchGames() {
  const { data, error } = await supabase
    .from('games')
    .select('id,name,total_marks')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function fetchScores() {
  const { data, error } = await supabase
    .from('game_scores')
    .select('id,user_name,marks,created_at,game:games(id,name,total_marks)')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_name: row.user_name,
    marks: row.marks,
    created_at: row.created_at,
    game_id: row.game?.id,
    game_name: row.game?.name,
    total_marks: row.game?.total_marks,
  }))
}

export async function signInAdmin(payload) {
  const { data, error } = await supabase.auth.signInWithPassword(payload)
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchAdminProfile(email) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function createGame(payload) {
  const { data, error } = await supabase
    .from('games')
    .insert(payload)
    .select('id,name,total_marks')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function createScore(payload) {
  const { error } = await supabase.from('game_scores').insert(payload)
  if (error) {
    throw new Error(error.message)
  }
}

export async function updateGame(id, payload) {
  const { data, error } = await supabase
    .from('games')
    .update(payload)
    .eq('id', id)
    .select('id,name,total_marks')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteGame(id) {
  const { error } = await supabase.from('games').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteScore(id) {
  const { error } = await supabase.from('game_scores').delete().eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
