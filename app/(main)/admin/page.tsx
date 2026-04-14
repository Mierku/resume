import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/dashboard?section=admin-users')
}
