'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAudit, requireRole } from '@/lib/actions/staff'
import type { ActionResult, ElectionStatus } from '@/lib/types'

function fail(error: unknown, fallback: string): ActionResult {
  const message = error instanceof Error ? error.message : fallback
  return { ok: false, error: message }
}

export async function saveElection(form: {
  id?: string
  title: string
  description: string
  logo_url?: string | null
  start_date: string
  end_date: string
}): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const row = {
    title: form.title,
    description: form.description,
    logo_url: form.logo_url ?? null,
    start_date: form.start_date,
    end_date: form.end_date,
  }
  const { error } = form.id
    ? await supabase.from('elections').update(row).eq('id', form.id)
    : await supabase.from('elections').insert(row)
  if (error) return fail(error, 'Could not save election.')
  await logAudit(form.id ? 'Election updated' : 'Election created', { title: form.title })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

export async function setElectionStatus(id: string, status: ElectionStatus): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const { error } = await supabase.from('elections').update({ status }).eq('id', id)
  if (error) {
    if (error.message.includes('one_ongoing_election'))
      return { ok: false, error: 'Another election is already ongoing. Close it first.' }
    return fail(error, 'Could not change election status.')
  }
  await logAudit(`Election status → ${status}`, { election_id: id })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

export async function toggleHideResults(id: string, hide: boolean): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const { error } = await supabase.from('elections').update({ hide_live_results: hide }).eq('id', id)
  if (error) return fail(error, 'Could not update setting.')
  await logAudit(hide ? 'Live results hidden' : 'Live results shown', { election_id: id })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

export async function deleteElection(id: string): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const { error } = await supabase.from('elections').delete().eq('id', id)
  if (error) return fail(error, 'Could not delete election.')
  await logAudit('Election deleted', { election_id: id })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

export async function savePosition(form: {
  id?: string
  election_id: string
  position_name: string
  max_votes: number
  rank_order: number
}): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const { id, ...row } = form
  const { error } = id
    ? await supabase.from('positions').update(row).eq('id', id)
    : await supabase.from('positions').insert(row)
  if (error) return fail(error, 'Could not save position.')
  revalidatePath('/admin/candidates')
  return { ok: true }
}

export async function deletePosition(id: string): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const { error } = await supabase.from('positions').delete().eq('id', id)
  if (error) return fail(error, 'Could not delete position.')
  revalidatePath('/admin/candidates')
  return { ok: true }
}

export async function saveCandidate(form: {
  id?: string
  position_id: string
  candidate_name: string
  grade_level: string
  section: string
  party_list: string
  party_color: string
  photo_url?: string | null
  motto: string
  display_order: number
}): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const { id, ...row } = form
  const { error } = id
    ? await supabase.from('candidates').update(row).eq('id', id)
    : await supabase.from('candidates').insert(row)
  if (error) return fail(error, 'Could not save candidate.')
  revalidatePath('/admin/candidates')
  return { ok: true }
}

export async function deleteCandidate(id: string): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const { error } = await supabase.from('candidates').delete().eq('id', id)
  if (error) return fail(error, 'Could not delete candidate.')
  revalidatePath('/admin/candidates')
  return { ok: true }
}
