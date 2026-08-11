'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Profile } from '@/lib/types'

const AUTH_COOKIE_HINT = '-auth-token'

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  let user: { id: string } | null = null
  try {
    // A refresh failure (e.g. refresh_token_not_found on a stale session)
    // must read as "not logged in", never as an unhandled error.
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    return null
  }
  if (!user) return null
  const { data } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single()
  return (data as Profile) ?? null
}

export async function requireRole(role?: 'admin'): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (role === 'admin' && profile.role !== 'admin') redirect('/watch')
  return profile
}

export async function logAudit(action: string, details: Record<string, unknown> = {}) {
  const supabase = await createClient()
  const profile = await getProfile()
  await supabase.from('audit_logs').insert({
    actor: profile ? `${profile.full_name} (${profile.role})` : 'system',
    action,
    details,
  })
}

export async function staffLogin(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { ok: false, error: 'Email and password are required.' }

  const supabase = await createClient()
  const { error, data } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: 'Invalid email or password.' }

  const userId = data.user?.id
  if (!userId) return { ok: false, error: 'Could not retrieve user.' }

  const { data: profile, error: profileErr } = await supabase
    .rpc('get_profile_by_id', { p_user_id: userId })

  if (profileErr) {
    return { ok: false, error: `DB error: ${profileErr.message}` }
  }

  if (!profile) {
    await supabase.auth.signOut()
    return { ok: false, error: 'No staff profile found for this account.' }
  }
  redirect(profile.role === 'admin' ? '/admin' : '/watch')
}

export async function staffLogout() {
  const supabase = await createClient()
  try {
    // scope 'local' keeps this fast and offline; on a dead session signOut
    // may skip the local cleanup entirely, so we clear the cookies ourselves.
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // session may already be dead — cookie cleanup below still runs
  }
  const store = await cookies()
  for (const cookie of store.getAll()) {
    if (!cookie.name.includes(AUTH_COOKIE_HINT)) continue
    store.set(cookie.name, '', { maxAge: 0, path: '/' })
  }
  redirect('/login')
}
