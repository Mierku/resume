import { redirect } from 'next/navigation'

function toQueryString(input: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      query.set(key, value)
      continue
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry))
    }
  }
  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

export default async function LegacyResumeEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ resumeId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { resumeId } = await params
  const query = toQueryString(await searchParams)
  redirect(`/builder/editor/${encodeURIComponent(resumeId)}${query}`)
}
