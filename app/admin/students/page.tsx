'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { CheckCircle2, FileUp, Plus, Search, Trash2, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { deleteStudent, importStudents, saveStudent, type StudentRow } from '@/lib/actions/students'
import { Button } from '@/components/ui/button'
import type { Student } from '@/lib/types'

const field =
  'rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40'

type SortKey = 'newest' | 'name' | 'id'

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [adding, setAdding] = useState(false)

  function showMessage(result: { ok: boolean; error?: string }, successText?: string) {
    setMessageIsError(!result.ok)
    setMessage(result.ok ? (successText ?? '') : result.error!)
  }
  const [form, setForm] = useState<StudentRow>({ lrn: '', full_name: '', grade_level: '', section: '', strand: '' })

  const load = useCallback(async () => {
    const supabase = createClient()
    const allStudents: Student[] = []
    const CHUNK = 1000
    let from = 0
    let hasMore = true
    while (hasMore) {
      const { data: chunk, error } = await supabase
        .from('students')
        .select('*')
        .order('grade_level')
        .order('section')
        .order('full_name')
        .range(from, from + CHUNK - 1)
      if (error) break
      if (!chunk?.length) { hasMore = false; break }
      allStudents.push(...(chunk as Student[]))
      if (chunk.length < CHUNK) hasMore = false
      from += CHUNK
    }
    setStudents(allStudents)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(id)
  }, [message])

  const grades = useMemo(() => [...new Set(students.map((s) => s.grade_level))], [students])
  const sections = useMemo(
    () => [...new Set(students.filter((s) => !grade || s.grade_level === grade).map((s) => s.section))],
    [students, grade],
  )

  const filtered = students
    .filter(
      (s) =>
        (!grade || s.grade_level === grade) &&
        (!section || s.section === section) &&
        (!search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.lrn.includes(search)),
    )
    .sort((a, b) => {
      if (sortKey === 'id') return a.lrn.localeCompare(b.lrn)
      if (sortKey === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return a.full_name.localeCompare(b.full_name)
    })

  // Accept common header variants (e.g. "Student ID", "Name", "Grade") in
  // addition to the exact lrn/full_name/grade_level/section names.
  const headerAliases: Record<string, keyof StudentRow> = {
    lrn: 'lrn',
    student_id: 'lrn',
    studentid: 'lrn',
    id: 'lrn',
    student_no: 'lrn',
    studentno: 'lrn',
    full_name: 'full_name',
    fullname: 'full_name',
    name: 'full_name',
    student_name: 'full_name',
    grade_level: 'grade_level',
    gradelevel: 'grade_level',
    grade: 'grade_level',
    year_level: 'grade_level',
    section: 'section',
    strand: 'strand',
  }
  const normalizeHeader = (h: string) => {
    const key = h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    return headerAliases[key] ?? key
  }

  async function importRows(rows: StudentRow[]) {
    const result = await importStudents(rows)
    showMessage(result, `Imported ${result.ok ? result.data?.count : 0} students.`)
    load()
  }

  function importCsv(file: File) {
    Papa.parse<StudentRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: ({ data }) => importRows(data),
    })
  }

  async function importExcel(file: File) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    const rows = rawRows.map((row) => {
      const normalized: Partial<StudentRow> = {}
      for (const [key, value] of Object.entries(row)) {
        const mapped = normalizeHeader(key)
        if (mapped === 'lrn' || mapped === 'full_name' || mapped === 'grade_level' || mapped === 'section' || mapped === 'strand') {
          normalized[mapped] = String(value)
        }
      }
      return normalized as StudentRow
    })
    importRows(rows)
  }

  function importFile(file: File) {
    if (file.name.toLowerCase().endsWith('.csv')) importCsv(file)
    else importExcel(file)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">{students.length} students in the masterlist</p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm font-medium hover:bg-muted">
            <FileUp className="size-4" /> Import CSV / Excel
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importFile(f)
                e.target.value = ''
              }}
            />
          </label>
          <Button onClick={() => setAdding(true)}>
            <Plus data-icon="inline-start" /> Add student
          </Button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Columns: Student No., Name, Grade, Section, Strand. Accepts .csv, .xlsx, and .xls files.
      </p>
      <AnimatePresence>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              messageIsError ? 'bg-destructive/15 text-destructive' : 'bg-accent text-accent-foreground'
            }`}
          >
            {messageIsError ? <TriangleAlert className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}{' '}
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      {adding && (
        <form
          className="glass mt-4 grid gap-3 rounded-2xl p-5 sm:grid-cols-6"
          onSubmit={async (e) => {
            e.preventDefault()
            const result = await saveStudent(form)
            showMessage(result, 'Student added.')
            if (result.ok) {
              setForm({ lrn: '', full_name: '', grade_level: '', section: '' })
              setAdding(false)
              load()
            }
          }}
        >
          <input required placeholder="Student ID (26-0588)" className={field} value={form.lrn} onChange={(e) => setForm({ ...form, lrn: e.target.value })} />
          <input required placeholder="Full name" className={field} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input required placeholder="Grade level" className={field} value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} />
          <input required placeholder="Section" className={field} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          <input placeholder="Strand" className={field} value={form.strand} onChange={(e) => setForm({ ...form, strand: e.target.value })} />
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search name or Student ID…"
            className={`${field} pl-9`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={field} value={grade} onChange={(e) => { setGrade(e.target.value); setSection('') }}>
          <option value="">All grades</option>
          {grades.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select className={field} value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="">All sections</option>
          {sections.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className={field} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="name">Sort: Name</option>
          <option value="newest">Sort: Newest first</option>
          <option value="id">Sort: Student ID</option>
        </select>
      </div>

      <div className="glass mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Student No.</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Grade</th>
              <th className="px-4 py-3 font-medium">Section</th>
              <th className="px-4 py-3 font-medium">Strand</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs">{s.lrn}</td>
                <td className="px-4 py-2.5">{s.full_name}</td>
                <td className="px-4 py-2.5">{s.grade_level}</td>
                <td className="px-4 py-2.5">{s.section}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.strand || '—'}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.status === 'voted' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${s.full_name}`}
                    onClick={async () => {
                      if (!confirm(`Remove ${s.full_name} from the masterlist?`)) return
                      const result = await deleteStudent(s.id)
                      showMessage(result, `${s.full_name} removed.`)
                      load()
                    }}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
