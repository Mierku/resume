import { redirect } from 'next/navigation'

interface AdminUsersPageProps {
  searchParams?: Promise<{
    q?: string | string[]
  }>
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const resolvedSearchParams = (await searchParams) || {}
  const rawQuery = Array.isArray(resolvedSearchParams.q)
    ? resolvedSearchParams.q[0]
    : resolvedSearchParams.q
  const params = new URLSearchParams({ section: 'admin-users' })

  if (rawQuery?.trim()) {
    params.set('q', rawQuery.trim())
  }

  redirect(`/dashboard?${params.toString()}`)
}
