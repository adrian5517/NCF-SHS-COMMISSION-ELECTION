'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { clearStudentSession, createStudentSession, getStudentSession } from '@/lib/student-session'
import type { ActionResult, Ballot } from '@/lib/types'

// ponytail: in-memory rate limiter — fine for one school lab server;
// move to Postgres/Redis if this ever runs multi-instance.
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 8
const WINDOW_MS = 60_000

function rateLimited(key: string) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_ATTEMPTS
}

export async function studentLogin(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const lrn = String(formData.get('lrn') ?? '').trim()
  const code = String(formData.get('code') ?? '').trim()
  if (!lrn || !code) return { ok: false, error: 'Please enter your Student ID and voting code.' }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'local'
  if (rateLimited(`${ip}:${lrn}`)) {
    return { ok: false, error: 'Too many attempts. Please wait a minute and try again.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('validate_voting_code', { p_lrn: lrn, p_code: code })
  if (error) return { ok: false, error: 'Connection problem. Please try again.' }
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Invalid credentials.' }

  await createStudentSession({
    studentId: data.student_id,
    studentName: data.student_name,
    codeId: data.code_id,
    electionId: data.election_id,
  })
  redirect('/ballot')
}

export async function getBallotForSession(): Promise<{ ballot: Ballot; studentName: string } | null> {
  const session = await getStudentSession()
  if (!session) return null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_ballot', { p_election_id: session.electionId })
  if (error || !data?.election) return null
  return { ballot: data as Ballot, studentName: session.studentName }
}

export async function submitBallot(selections: Record<string, string[]>): Promise<ActionResult> {
  const session = await getStudentSession()
  if (!session) return { ok: false, error: 'Your session expired. Please log in again.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_ballot', {
    p_code_id: session.codeId,
    p_student_id: session.studentId,
    p_selections: selections,
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
