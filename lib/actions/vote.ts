'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { clearStudentSession, createStudentSession, getStudentSession } from '@/lib/student-session'
import type { ActionResult, Ballot } from '@/lib/types'

// ponytail: in-memory rate limiters — fine for one school-lab single-instance
// server; move to Postgres/Redis if this ever runs multi-instance.

/** Per-IP+LRN login throttle — 8 attempts / minute */
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const LOGIN_MAX = 8
const LOGIN_WINDOW = 60_000

function loginLimited(key: string) {
  const now = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW })
    return false
  }
  entry.count++
  return entry.count > LOGIN_MAX
}

/** Global submit throttle — 200 submissions / 10 s (matches Pro's 200-connection pool) */
let globalSubmitCount = 0
let globalSubmitResetAt = 0
const GLOBAL_SUBMIT_MAX = 200
const GLOBAL_SUBMIT_WINDOW = 10_000

function globalSubmitLimited(): boolean {
  const now = Date.now()
  if (now > globalSubmitResetAt) { globalSubmitCount = 0; globalSubmitResetAt = now + GLOBAL_SUBMIT_WINDOW }
  globalSubmitCount++
  return globalSubmitCount > GLOBAL_SUBMIT_MAX
}

/** Per-student retry guard — 3 attempts / 30 s (catches double-taps if RPC hangs) */
const studentSubmitAttempts = new Map<string, { count: number; resetAt: number }>()
const STUDENT_SUBMIT_MAX = 3
const STUDENT_SUBMIT_WINDOW = 30_000

function studentSubmitLimited(studentId: string): boolean {
  const now = Date.now()
  const entry = studentSubmitAttempts.get(studentId)
  if (!entry || entry.resetAt < now) {
    studentSubmitAttempts.set(studentId, { count: 1, resetAt: now + STUDENT_SUBMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > STUDENT_SUBMIT_MAX
}

export async function studentLogin(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const lrn = String(formData.get('lrn') ?? '').trim()
  const code = String(formData.get('code') ?? '').trim()
  if (!lrn || !code) return { ok: false, error: 'Please enter your Student ID and voting code.' }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'local'
  if (loginLimited(`${ip}:${lrn}`)) {
    return { ok: false, error: 'Too many attempts. Please wait a minute and try again.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('validate_voting_code', { p_lrn: lrn, p_code: code })
  if (error) return { ok: false, error: 'Connection problem. Please try again.' }
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Invalid credentials.' }

  await createStudentSession({
    studentId: data.student_id,
    studentName: data.student_name,
    gradeLevel: data.grade_level,
    codeId: data.code_id,
    electionId: data.election_id,
  })
  redirect('/ballot')
}

export async function getBallotForSession(): Promise<{ ballot: Ballot; studentName: string } | null> {
  const session = await getStudentSession()
  if (!session) return null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_ballot', {
    p_election_id: session.electionId,
    p_grade_level: session.gradeLevel,
  })
  if (error || !data?.election) return null
  return { ballot: data as Ballot, studentName: session.studentName }
}

export async function submitBallot(selections: Record<string, string[]>): Promise<ActionResult> {
  const session = await getStudentSession()
  if (!session) return { ok: false, error: 'Your session expired. Please log in again.' }

  // Per-student retry guard
  if (studentSubmitLimited(session.studentId)) {
    return { ok: false, error: 'Too many attempts. Please wait 30 seconds before retrying.' }
  }

  // Global flood protection
  if (globalSubmitLimited()) {
    return { ok: false, error: 'The system is at capacity. Please wait a moment and tap "Retry".' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_ballot', {
    p_code_id: session.codeId,
    p_student_id: session.studentId,
    p_selections: selections,
    p_grade_level: session.gradeLevel,
  })
  if (error) return { ok: false, error: 'Connection problem — your vote was NOT lost. Tap "Submit" to retry.' }
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Submission failed.' }

  await clearStudentSession()
  return { ok: true }
}

export async function exitBallot() {
  await clearStudentSession()
  redirect('/vote')
}
