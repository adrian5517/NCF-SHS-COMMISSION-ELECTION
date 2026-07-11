'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAudit, requireRole } from '@/lib/actions/staff'
import type { ActionResult } from '@/lib/types'

export interface StudentRow {
  lrn: string
  full_name: string
  grade_level: string
  section: string
}

export async function importStudents(rows: StudentRow[]): Promise<ActionResult<{ count: number }>> {
  await requireRole('admin')
  const clean = rows
    .map((r) => ({
      lrn: String(r.lrn ?? '').trim(),
      full_name: String(r.full_name ?? '').trim(),
      grade_level: String(r.grade_level ?? '').trim(),
      section: String(r.section ?? '').trim(),
    }))
    .filter((r) => r.lrn && r.full_name && r.grade_level && r.section)
  if (clean.length === 0) return { ok: false, error: 'No valid rows. Expected columns: lrn, full_name, grade_level, section.' }

  const supabase = await createClient()
  const { error } = await supabase.from('students').upsert(clean, { onConflict: 'lrn', ignoreDuplicates: false })
  if (error) return { ok: false, error: error.message }
  await logAudit('Students imported', { count: clean.length })
  revalidatePath('/admin/students')
  return { ok: true, data: { count: clean.length } }
}

export async function saveStudent(form: StudentRow & { id?: string }): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const { id, ...row } = form
  const { error } = id
    ? await supabase.from('students').update(row).eq('id', id)
    : await supabase.from('students').insert(row)
  if (error) return { ok: false, error: error.message.includes('students_lrn_key') ? 'That Student ID already exists.' : error.message }
  revalidatePath('/admin/students')
  return { ok: true }
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  await requireRole('admin')
  const supabase = await createClient()
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/students')
  return { ok: true }
}
