'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Profile } from '@/lib/types'

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
  await supabase.auth.signOut()
  redirect('/login')
}
