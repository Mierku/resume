import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { getResume } from '@/server/resumes'
import { getDataSources } from '@/server/dataSources'
import { ResumeBuilderClient } from '@/components/resume-builder/ResumeBuilderClient'
import { createFreshResumeContent, createMockResumeDataSource, normalizeTemplateId } from '@/lib/resume/mappers'

export default async function ResumeEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ resumeId: string }>
  searchParams: Promise<{ template?: string; title?: string }>
}) {
  const { resumeId } = await params
  const query = await searchParams
  const user = await getCurrentUser()

  if (!user) {
    if (resumeId !== 'new') {
      redirect(`/login?next=${encodeURIComponent(`/resume/editor/${resumeId}`)}`)
    }

    const initialTemplate = normalizeTemplateId(query.template)
    const initialTitle = String(query.title || '').trim() || '未命名简历'
    const guestContent = createFreshResumeContent(initialTemplate, createMockResumeDataSource())

    return (
      <ResumeBuilderClient
        initialResume={{
          id: 'guest-new',
          title: initialTitle,
          templateId: initialTemplate,
          dataSourceId: null,
          content: guestContent,
        }}
        dataSources={[]}
      />
    )
  }

  const [resume, dataSources] = await Promise.all([
    getResume(resumeId, user.id),
    getDataSources(user.id),
  ])

  if (!resume) {
    redirect('/resume/my-resumes')
  }

  return (
    <ResumeBuilderClient
      initialResume={{
        id: resume.id,
        title: resume.title,
        templateId: resume.templateId,
        dataSourceId: resume.dataSourceId,
        content: resume.content,
      }}
      dataSources={dataSources.map(source => ({
        id: source.id,
        name: source.name,
        basics: source.basics as Record<string, unknown>,
        intention: source.intention as Record<string, unknown> | null,
        summaryZh: source.summaryZh,
        summaryEn: source.summaryEn,
        education: source.education as Array<Record<string, unknown>>,
        work: source.work as Array<Record<string, unknown>>,
        projects: source.projects as Array<Record<string, unknown>>,
        skills: source.skills as string[],
      }))}
    />
  )
}
