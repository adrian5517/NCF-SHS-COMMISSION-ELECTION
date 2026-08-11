import type { VotingMechanics } from '@/lib/types'

/** Shared default voting mechanics shown to every voter when an election
 * hasn't customized its own (elections.voting_mechanics is null). Editing
 * this file changes the fallback everywhere — it is intentionally the single
 * source of truth for that default. */
export const DEFAULT_VOTING_MECHANICS: VotingMechanics = {
  intro:
    'Welcome to the NCF BED–SHS Commission on Elections (COMELEC) Voting System.',
  heading: 'Voting Mechanics',
  preface:
    'Before proceeding to the official ballot, please take a moment to read and understand the election guidelines.',
  guidelines: [
    'Each eligible voter is permitted to cast one (1) vote only using their assigned voter access code.',
    'Once your ballot has been submitted, your vote is considered final and can no longer be modified.',
    'All votes will be kept strictly confidential and will be counted in accordance with the official rules and procedures of the NCF BED–SHS Commission on Elections (COMELEC).',
  ],
  consentNote:
    'By proceeding to the next section, you acknowledge that you have read, understood, and agreed to abide by these voting guidelines.',
  acknowledgment:
    'I have read, understood, and acknowledged the Voting Mechanics and agree to abide by the official election guidelines.',
  declarationTitle: 'Statement of Declaration',
  declarationIntro:
    'Please read the declaration below carefully before submitting your ballot. By selecting "True and Correct," you affirm that the information you have provided is accurate, that you have cast your vote voluntarily and honestly, and that you understand your ballot is final upon submission.',
  declarationAffirmation: 'True and Correct',
  declarationSubmitNote:
    'By pressing "CAST MY VOTE," I confirm that the votes I have cast are accurate, final, and reflect my intended choices. I understand that once my ballot is submitted, it cannot be modified, withdrawn, or resubmitted.',
}

/** Merge a possibly-partial DB value (or null) over the shared default so
 * the kiosk always renders a complete, safe-to-render mechanics screen. */
export function normalizeVotingMechanics(raw: unknown): VotingMechanics {
  const partial = (raw ?? {}) as Partial<VotingMechanics>
  return {
    intro:
      typeof partial.intro === 'string' && partial.intro.trim()
        ? partial.intro
        : DEFAULT_VOTING_MECHANICS.intro,
    heading:
      typeof partial.heading === 'string' && partial.heading.trim()
        ? partial.heading
        : DEFAULT_VOTING_MECHANICS.heading,
    preface:
      typeof partial.preface === 'string' && partial.preface.trim()
        ? partial.preface
        : DEFAULT_VOTING_MECHANICS.preface,
    guidelines:
      Array.isArray(partial.guidelines) && partial.guidelines.length
        ? partial.guidelines
            .map((line) => (typeof line === 'string' ? line.trim() : ''))
            .filter(Boolean)
        : DEFAULT_VOTING_MECHANICS.guidelines,
    consentNote:
      typeof partial.consentNote === 'string' && partial.consentNote.trim()
        ? partial.consentNote
        : DEFAULT_VOTING_MECHANICS.consentNote,
    acknowledgment:
      typeof partial.acknowledgment === 'string' && partial.acknowledgment.trim()
        ? partial.acknowledgment
        : DEFAULT_VOTING_MECHANICS.acknowledgment,
    declarationTitle:
      typeof partial.declarationTitle === 'string' && partial.declarationTitle.trim()
        ? partial.declarationTitle
        : DEFAULT_VOTING_MECHANICS.declarationTitle,
    declarationIntro:
      typeof partial.declarationIntro === 'string' && partial.declarationIntro.trim()
        ? partial.declarationIntro
        : DEFAULT_VOTING_MECHANICS.declarationIntro,
    declarationAffirmation:
      typeof partial.declarationAffirmation === 'string' && partial.declarationAffirmation.trim()
        ? partial.declarationAffirmation
        : DEFAULT_VOTING_MECHANICS.declarationAffirmation,
    declarationSubmitNote:
      typeof partial.declarationSubmitNote === 'string' && partial.declarationSubmitNote.trim()
        ? partial.declarationSubmitNote
        : DEFAULT_VOTING_MECHANICS.declarationSubmitNote,
  }
}
