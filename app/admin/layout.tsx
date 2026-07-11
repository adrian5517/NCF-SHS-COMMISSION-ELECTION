import { requireRole, staffLogout } from '@/lib/actions/staff'
import { AdminNav } from '@/components/admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole('admin')

  return (
    <div className="bg-aurora flex min-h-screen flex-col md:flex-row">
      <AdminNav fullName={profile.full_name} logoutAction={staffLogout} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  )
}
