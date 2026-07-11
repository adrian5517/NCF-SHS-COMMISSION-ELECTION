export type Role = 'admin' | 'watcher'
export type ElectionStatus = 'draft' | 'upcoming' | 'ongoing' | 'closed' | 'archived'

export interface Profile {
  id: string
  full_name: string
  role: Role
}

export interface Election {
  id: string
  title: string
  description: string
  logo_url: string | null
  start_date: string
  end_date: string
  status: ElectionStatus
  hide_live_results: boolean
  created_at: string
}

export interface Position {
  id: string
  election_id: string
  position_name: string
  max_votes: number
  rank_order: number
}

export interface Candidate {
  id: string
  position_id: string
  candidate_name: string
  grade_level: string
  section: string
  party_list: string
  party_color: string
  photo_url: string | null
  motto: string
  display_order: number
}

export interface Student {
  id: string
  lrn: string
  full_name: string
  grade_level: string
  section: string
  status: 'pending' | 'voted'
  created_at: string
}

export interface VotingCode {
  id: string
  student_id: string
  election_id: string
  code: string
  expires_at: string
  is_used: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  actor: string
  action: string
  details: Record<string, unknown>
  created_at: string
}

export interface BallotPosition {
  id: string
  position_name: string
  max_votes: number
  candidates: BallotCandidate[]
}

export interface BallotCandidate {
  id: string
  candidate_name: string
  grade_level: string
  section: string
  party_list: string
  party_color: string
  photo_url: string | null
  motto: string
}

export interface Ballot {
  election: { id: string; title: string; logo_url: string | null }
  positions: BallotPosition[]
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }
