'use server'

import { revalidatePath } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { logAudit, requireRole } from '@/lib/actions/staff'
import type { ActionResult } from '@/lib/types'

// No 0/O/1/I/L — kids will type these on lab keyboards.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode(length = 5) {
  const bytes = randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length]
  return code
}

export async function bulkGenerateCodes(params: {
  electionId: string
  gradeLevel: string
  section: string
  minutes: number
  /** Regenerate codes even for students who already have a still-active one. */
  force?: boolean
}): Promise<ActionResult<{ count: number; skipped: number }>> {
  await requireRole('admin')
  const supabase = await createClient()

  let baseQuery = supabase.from('students').select('id').eq('status', 'pending')
  if (params.gradeLevel) baseQuery = baseQuery.eq('grade_level', params.gradeLevel)
  if (params.section) baseQuery = baseQuery.eq('section', params.section)

  const allIds: string[] = []
  const CHUNK = 1000
  let from = 0
  let hasMore = true
  while (hasMore) {
    const { data: chunk, error } = await baseQuery.range(from, from + CHUNK - 1)
    if (error) return { ok: false, error: error.message }
    if (!chunk?.length) { hasMore = false; break }
    allIds.push(...chunk.map((s) => s.id))
    if (chunk.length < CHUNK) hasMore = false
    from += CHUNK
  }
  if (!allIds.length) return { ok: false, error: 'No pending students found.' }

  let targetIds = allIds
  let skipped = 0

  if (!params.force) {
    // Don't touch students who already have a valid, unused code — protects
    // codes already printed/handed out when new students are added later.
    const idSet = new Set(allIds)
    const activeCodes: string[] = []
    let acFrom = 0
    let acHasMore = true
    while (acHasMore) {
      const { data: chunk } = await supabase
        .from('voting_codes')
        .select('student_id')
        .eq('election_id', params.electionId)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('student_id')
        .range(acFrom, acFrom + CHUNK - 1)
      if (!chunk?.length) { acHasMore = false; break }
      for (const r of chunk) { if (idSet.has(r.student_id)) activeCodes.push(r.student_id) }
      if (chunk.length < CHUNK) acHasMore = false
      acFrom += CHUNK
    }
    const alreadyActive = new Set(activeCodes)
    targetIds = allIds.filter((id) => !alreadyActive.has(id))
    skipped = alreadyActive.size
  }

  if (targetIds.length === 0) {
    return { ok: true, data: { count: 0, skipped } }
  }

  const expiresAt = params.minutes === -1 ? '9999-12-31T23:59:59Z' : new Date(Date.now() + params.minutes * 60_000).toISOString()
  const rows = targetIds.map((id) => ({
    student_id: id,
    election_id: params.electionId,
    code: generateCode(),
    expires_at: expiresAt,
  }))

  // Clear out any stale (expired or, if forced, still-active) unused codes for these students first.
  const INSERT_CHUNK = 500
  for (let i = 0; i < targetIds.length; i += INSERT_CHUNK) {
    const chunk = targetIds.slice(i, i + INSERT_CHUNK)
    await supabase
      .from('voting_codes')
      .delete()
      .eq('election_id', params.electionId)
      .eq('is_used', false)
      .in('student_id', chunk)
  }

  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK)
    const { error: insertError } = await supabase.from('voting_codes').insert(chunk)
    if (insertError) return { ok: false, error: insertError.message }
  }

  await logAudit('Bulk codes generated', {
    grade_level: params.gradeLevel,
    section: params.section,
    count: rows.length,
    skipped,
    minutes: params.minutes,
    force: params.force ?? false,
  })
  revalidatePath('/admin/codes')
  return { ok: true, data: { count: rows.length, skipped } }
}

export async function regenerateCode(params: {
  electionId: string
  studentId: string
  minutes: number
}): Promise<ActionResult<{ code: string }>> {
  await requireRole('admin')
  const supabase = await createClient()

  await supabase
    .from('voting_codes')
    .delete()
    .eq('election_id', params.electionId)
    .eq('student_id', params.studentId)
    .eq('is_used', false)

  const code = generateCode()
  const { error } = await supabase.from('voting_codes').insert({
    student_id: params.studentId,
    election_id: params.electionId,
    code,
    expires_at: params.minutes === -1 ? '9999-12-31T23:59:59Z' : new Date(Date.now() + params.minutes * 60_000).toISOString(),
  })
  if (error) return { ok: false, error: error.message }

  await logAudit('Code regenerated', { student_id: params.studentId })
  revalidatePath('/admin/codes')
  return { ok: true, data: { code } }
}

export async function resetElectionVotes(
  electionId: string,
): Promise<ActionResult<{ votesDeleted: number; studentsReset: number }>> {
  await requireRole('admin')
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('reset_election_votes', { p_election_id: electionId })
  if (error) return { ok: false, error: error.message }
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Reset failed.' }

  await logAudit('Election votes reset', {
    election_id: electionId,
    votes_deleted: data.votes_deleted,
    students_reset: data.students_reset,
  })
  revalidatePath('/admin/codes')
  revalidatePath('/admin/results')
  return { ok: true, data: { votesDeleted: data.votes_deleted, studentsReset: data.students_reset } }
}
