import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE = 'ncf_student_session'
const MAX_AGE_SECONDS = 15 * 60 // a ballot session lives 15 minutes max

export interface StudentSession {
  studentId: string
  studentName: string
  codeId: string
  electionId: string
}

function secret() {
  const s = process.env.STUDENT_SESSION_SECRET
  if (!s) throw new Error('STUDENT_SESSION_SECRET env var is not set')
  return new TextEncoder().encode(s)
}

export async function createStudentSession(session: StudentSession) {
  const jwt = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret())

  const store = await cookies()
  store.set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return {
      studentId: payload.studentId as string,
      studentName: payload.studentName as string,
      codeId: payload.codeId as string,
      electionId: payload.electionId as string,
    }
  } catch {
    return null
  }
}

export async function clearStudentSession() {
  const store = await cookies()
  store.delete(COOKIE)
}

export const STUDENT_COOKIE = COOKIE
