'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { clearStudentSession, createStudentSession, getStudentSession } from '@/lib/student-session'
import type { ActionResult, Ballot, VotingMechanics } from '@/lib/types'
import { DEFAULT_VOTING_MECHANICS, normalizeVotingMechanics } from '@/lib/voting-mechanics'

// ponytail: in-memory rate limiters — fine for one school-lab single-instance
// server; move to Postgres/Redis if this ever runs multi-instance.

/** In-memory fallback throttles, used only while the DB-side limiter RPCs
 * (check_login_attempt_limit / check_submit_attempt_limit) are unavailable,
 * e.g. before the rate-limit schema migration is applied. */
const memThrottles = new Map<string, { count: number; resetAt: number }>()
function throttleLimited(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const entry = memThrottles.get(key)
  if (!entry || entry.resetAt < now) {
    memThrottles.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count++
  return entry.count > max
}

const submitInFlight = new Set<string>()
const METRICS_LOG_EVERY_MS = 60_000

const submitMetrics = {
  preventedInFlight: 0,
  preventedRecent: 0,
  successful: 0,
  failed: 0,
  lastLogAt: 0,
}

function noteSubmitMetric(kind: 'preventedInFlight' | 'preventedRecent' | 'successful' | 'failed') {
  submitMetrics[kind]++
  const now = Date.now()
  if (now - submitMetrics.lastLogAt < METRICS_LOG_EVERY_MS) return
  submitMetrics.lastLogAt = now
  console.info('[vote-submit-metrics]', {
    preventedInFlight: submitMetrics.preventedInFlight,
    preventedRecent: submitMetrics.preventedRecent,
    successful: submitMetrics.successful,
    failed: submitMetrics.failed,
    activeInFlight: submitInFlight.size,
    recentCacheSize: 0,
  })
}

export async function getVoteSubmitMetrics() {
  return {
    preventedInFlight: submitMetrics.preventedInFlight,
    preventedRecent: submitMetrics.preventedRecent,
    successful: submitMetrics.successful,
    failed: submitMetrics.failed,
    activeInFlight: submitInFlight.size,
    recentCacheSize: 0,
    lastLoggedAt: submitMetrics.lastLogAt,
  }
}

export async function studentLogin(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const lrn = String(formData.get('lrn') ?? '').trim()
    const code = String(formData.get('code') ?? '').trim()
    if (!lrn || !code) return { ok: false, error: 'Please enter your Student ID and voting code.' }

    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'local'
    const supabase = createAdminClient()
    const { data: limitData, error: limitError } = await supabase.rpc('check_login_attempt_limit', {
      p_attempt_key: `${ip}:${lrn}`,
      p_window_ms: 60_000,
      p_max_attempts: 8,
    })
    if (limitError) {
      if (throttleLimited(`login:${ip}:${lrn}`, 8, 60_000)) {
        return { ok: false, error: 'Too many attempts. Please wait a minute and try again.' }
      }
    } else if (!limitData?.ok) {
      return { ok: false, error: limitData?.error ?? 'Too many attempts. Please wait a minute and try again.' }
    }

    const { data, error } = await (await createClient()).rpc('validate_voting_code', { p_lrn: lrn, p_code: code })
    if (error || !data?.ok) return { ok: false, error: data?.error ?? 'Invalid credentials.' }

    await createStudentSession({
      studentId: data.student_id,
      studentName: data.student_name,
      gradeLevel: data.grade_level,
      codeId: data.code_id,
      electionId: data.election_id,
    })
  } catch {
    return { ok: false, error: 'Unexpected login error. Please try again.' }
  }
  // Outside the try: redirect() signals navigation by throwing, so it must
  // never be swallowed by the error handler above.
  redirect('/ballot')
}

export async function getBallotForSession(): Promise<{
  ballot: Ballot
  studentName: string
  votingMechanics: VotingMechanics
} | null> {
  try {
    const session = await getStudentSession()
    if (!session) return null
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_ballot', {
      p_election_id: session.electionId,
      p_grade_level: session.gradeLevel,
    })
    if (error || !data?.election) return null
    const ballot = data as Ballot
    const visiblePositions = ballot.positions.filter((position) => {
      const allowedGrades = position.eligible_grade_levels ?? []
      return allowedGrades.length === 0 || !session.gradeLevel || allowedGrades.includes(session.gradeLevel)
    })

    // Per-election mechanics are optional (column may not exist yet on older
    // deployments) — never fail the ballot load over missing copy.
    let votingMechanics: VotingMechanics = DEFAULT_VOTING_MECHANICS
    try {
      const adminSupabase = createAdminClient()
      const { data: mechanicsRow } = await adminSupabase
        .from('elections')
        .select('voting_mechanics')
        .eq('id', session.electionId)
        .single()
      votingMechanics = normalizeVotingMechanics(mechanicsRow?.voting_mechanics)
    } catch {
      votingMechanics = DEFAULT_VOTING_MECHANICS
    }

    return {
      ballot: { ...ballot, positions: visiblePositions },
      studentName: session.studentName,
      votingMechanics,
    }
  } catch {
    return null
  }
}

export async function submitBallot(selections: Record<string, string[]>): Promise<ActionResult> {
  let dedupeKey: string | null = null
  try {
    const session = await getStudentSession()
    if (!session) return { ok: false, error: 'Your session expired. Please log in again.' }

    dedupeKey = `${session.electionId}:${session.studentId}:${session.codeId}`
    if (submitInFlight.has(dedupeKey)) {
      noteSubmitMetric('preventedInFlight')
      return { ok: false, error: 'Your ballot is already being submitted. Please wait.' }
    }
    submitInFlight.add(dedupeKey)

    const supabase = createAdminClient()
    let studentLimitExceeded: string | null = null
    const { data: studentLimitData, error: studentLimitError } = await supabase.rpc('check_submit_attempt_limit', {
      p_attempt_key: `student:${session.studentId}`,
      p_window_ms: 30_000,
      p_max_attempts: 3,
    })
    if (studentLimitError) {
      if (throttleLimited(`submit:${session.studentId}`, 3, 30_000)) {
        studentLimitExceeded = 'Too many attempts. Please wait 30 seconds before retrying.'
      }
    } else if (!studentLimitData?.ok) {
      studentLimitExceeded = studentLimitData?.error ?? 'Too many attempts. Please wait 30 seconds before retrying.'
    }
    if (studentLimitExceeded) {
      noteSubmitMetric('failed')
      return { ok: false, error: studentLimitExceeded }
    }

    let globalLimitExceeded: string | null = null
    const { data: globalLimitData, error: globalLimitError } = await supabase.rpc('check_submit_attempt_limit', {
      p_attempt_key: 'global:submit',
      p_window_ms: 10_000,
      p_max_attempts: 200,
    })
    if (globalLimitError) {
      if (throttleLimited('submit:global', 200, 10_000)) {
        globalLimitExceeded = 'The system is at capacity. Please wait a moment and tap "Retry".'
      }
    } else if (!globalLimitData?.ok) {
      globalLimitExceeded = 'The system is at capacity. Please wait a moment and tap "Retry".'
    }
    if (globalLimitExceeded) {
      noteSubmitMetric('failed')
      return { ok: false, error: globalLimitExceeded }
    }

    const { data, error } = await (await createClient()).rpc('submit_ballot', {
      p_code_id: session.codeId,
      p_student_id: session.studentId,
      p_selections: selections,
      p_grade_level: session.gradeLevel,
    })
    if (error) {
      noteSubmitMetric('failed')
      return { ok: false, error: 'Connection problem — your vote was NOT lost. Tap "Submit" to retry.' }
    }
    if (!data?.ok) {
      if (String(data?.error ?? '').toLowerCase().includes('already submitted')) {
        noteSubmitMetric('preventedRecent')
        return { ok: true }
      }
      noteSubmitMetric('failed')
      return { ok: false, error: data?.error ?? 'Submission failed.' }
    }

    noteSubmitMetric('successful')
    // Session is intentionally kept until the thank-you screen has shown;
    // exitBallot() clears it when the booth resets.
    return { ok: true }
  } finally {
    if (dedupeKey) {
      submitInFlight.delete(dedupeKey)
    }
  }
}

export async function exitBallot() {
  await clearStudentSession()
  redirect('/vote')
}
