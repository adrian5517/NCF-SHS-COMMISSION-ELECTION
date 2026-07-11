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

  const { data: students, error } = await supabase
    .from('students')
    .select('id')
    .eq('grade_level', params.gradeLevel)
    .eq('section', params.section)
    .eq('status', 'pending')
  if (error) return { ok: false, error: error.message }
  if (!students?.length) return { ok: false, error: 'No pending students in that section.' }

  const studentIds = students.map((s) => s.id)
  let targetIds = studentIds
  let skipped = 0

  if (!params.force) {
    // Don't touch students who already have a valid, unused code — protects
    // codes already printed/handed out when new students are added later.
    const { data: activeCodes } = await supabase
      .from('voting_codes')
      .select('student_id')
      .eq('election_id', params.electionId)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .in('student_id', studentIds)
    const alreadyActive = new Set((activeCodes ?? []).map((c) => c.student_id))
    targetIds = studentIds.filter((id) => !alreadyActive.has(id))
    skipped = alreadyActive.size
  }

  if (targetIds.length === 0) {
    return { ok: true, data: { count: 0, skipped } }
  }

  const expiresAt = new Date(Date.now() + params.minutes * 60_000).toISOString()
  const rows = targetIds.map((id) => ({
    student_id: id,
    election_id: params.electionId,
    code: generateCode(),
    expires_at: expiresAt,
  }))

  // Clear out any stale (expired or, if forced, still-active) unused codes for these students first.
  await supabase
    .from('voting_codes')
    .delete()
    .eq('election_id', params.electionId)
    .eq('is_used', false)
    .in('student_id', targetIds)

  const { error: insertError } = await supabase.from('voting_codes').insert(rows)
  if (insertError) return { ok: false, error: insertError.message }

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
    expires_at: new Date(Date.now() + params.minutes * 60_000).toISOString(),
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
