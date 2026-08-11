import { redirect } from 'next/navigation'
import { getBallotForSession } from '@/lib/actions/vote'
import { BallotWizard } from '@/components/ballot-wizard'

export default async function BallotPage() {
  const session = await getBallotForSession()
  if (!session) redirect('/vote')

  return (
    <BallotWizard
      ballot={session.ballot}
      studentName={session.studentName}
      votingMechanics={session.votingMechanics}
    />
  )
}
