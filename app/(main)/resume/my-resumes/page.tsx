'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Edit, FileText, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { AuthRequiredModal } from '@/components/ui/Modal'
import { toast } from '@/lib/toast'
import { RESUME_TEMPLATES } from '@/lib/constants'
import { useAuthedPageData } from '@/lib/hooks/useAuthedPageData'
import s from './my-resumes.module.css'

interface Resume {
  id: string
  title: string
  templateId: string
  updatedAt: string
  dataSource?: {
    id: string
    name: string
  }
}

type ResumeAction = 'duplicate' | 'delete'

export default function MyResumesPage() {
  const [activeAction, setActiveAction] = useState<{ type: ResumeAction; resumeId: string } | null>(null)
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, boolean>>({})
  const [showAuthModal, setShowAuthModal] = useState(false)

  const loadResumes = useCallback(
    async ({ signal, auth }: { signal: AbortSignal; auth: { authenticated: boolean } }) => {
      if (!auth.authenticated) {
        return []
      }

      const response = await fetch('/api/resumes', { cache: 'no-store', signal })
      if (response.status === 401) {
        return []
      }

      if (!response.ok) {
        throw new Error('简历列表加载失败')
      }

      const payload = await response.json().catch(() => null)
      if (!payload || typeof payload !== 'object') {
        return []
      }

      const resumes = (payload as { resumes?: unknown[] }).resumes
      return Array.isArray(resumes) ? (resumes as Resume[]) : []
    },
    [],
  )

  const { data: resumes, loading, auth, reload } = useAuthedPageData<Resume[]>({
    initialData: [],
    load: loadResumes,
    onError: error => {
      console.error('Failed to fetch resumes:', error)
    },
  })
  const authenticated = auth.authenticated

  useEffect(() => {
    if (loading || authenticated) return
    setShowAuthModal(true)
  }, [authenticated, loading])

  const handleDuplicate = async (id: string) => {
    if (activeAction) return
    setActiveAction({ type: 'duplicate', resumeId: id })

    try {
      const res = await fetch(`/api/resumes/${id}/duplicate`, { method: 'POST' })
      if (res.ok) {
        toast.success('复制成功')
        reload()
      } else {
        toast.error('复制失败')
      }
    } catch {
      toast.error('复制失败')
    } finally {
      setActiveAction(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (activeAction) return
    if (!confirm('确定要删除这份简历吗？')) return
    setActiveAction({ type: 'delete', resumeId: id })

    try {
      const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('删除成功')
        reload()
      } else {
        toast.error('删除失败')
      }
    } catch {
      toast.error('删除失败')
    } finally {
      setActiveAction(null)
    }
  }

  const getTemplateMeta = (templateId: string) => {
    return RESUME_TEMPLATES.find(template => template.id === templateId) || RESUME_TEMPLATES[0]
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px]">
        <div className={s.page}>
          <Skeleton className="h-8 w-32" />
          <div className={s.grid}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-44 rounded-[12px]" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <>
        <div className="mx-auto w-full max-w-[1440px]">
          <div className={s.page}>
            <div className="rounded-[12px] border border-border bg-background/70 p-8 text-center">
              <p className="text-sm text-muted-foreground">登录后可查看和管理你的简历。</p>
              <div className="mt-4">
                <Link href="/login?next=%2Fresume%2Fmy-resumes">
                  <Button>去登录</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <AuthRequiredModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          redirectPath="/resume/my-resumes"
        />
      </>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div className={s.page}>
        <section className={s.hero}>
          <div className={s.heroCopy}>
            <p className={s.heroEyebrow}>RESUME WORKSPACE</p>
            <h1 className={s.heroTitle}>我的简历</h1>
            <p className={s.heroHint}>管理、复制和编辑你的简历版本，保持投递内容始终一致。</p>
          </div>
          <Link href="/resume/templates">
            <Button icon={<Plus />}>新建简历</Button>
          </Link>
        </section>

        {resumes.length > 0 ? (
          <div className={s.grid}>
            {resumes.map(resume => {
              const templateMeta = getTemplateMeta(resume.templateId)
              const duplicateLoading = activeAction?.type === 'duplicate' && activeAction.resumeId === resume.id
              const deleteLoading = activeAction?.type === 'delete' && activeAction.resumeId === resume.id
              const actionLocked = Boolean(activeAction)

              return (
                <article key={resume.id} className={s.card}>
                  <div className={s.preview}>
                    {templateMeta.preview && !brokenPreviews[templateMeta.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={templateMeta.preview}
                        alt={`${templateMeta.name} 模板预览`}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className={s.previewImage}
                        onError={() =>
                          setBrokenPreviews(prev => ({
                            ...prev,
                            [templateMeta.id]: true,
                          }))
                        }
                      />
                    ) : (
                      <div className={s.previewFallback}>预览图缺失</div>
                    )}
                  </div>

                  <div className={s.cardHead}>
                    <div className={s.titleWrap}>
                      <h3 className={s.title}>{resume.title}</h3>
                      <p className={s.meta}>{templateMeta.name}</p>
                    </div>
                    <span className={s.chip}>简历</span>
                  </div>

                  <p className={s.description}>{templateMeta.description}</p>
                  {resume.dataSource && <p className={s.source}>数据源：{resume.dataSource.name}</p>}
                  <p className={s.time}>更新于 {formatDate(resume.updatedAt)}</p>

                  <div className={s.actions}>
                    <Link href={`/resume/editor/${resume.id}`} className={s.editLink}>
                      <Button variant="outline" size="sm" className="w-full" icon={<Edit />}>编辑</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={s.iconBtn}
                      onClick={() => handleDuplicate(resume.id)}
                      title="复制"
                      aria-label="复制"
                      icon={<Copy />}
                      loading={duplicateLoading}
                      disabled={actionLocked && !duplicateLoading}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={s.iconBtn}
                      onClick={() => handleDelete(resume.id)}
                      title="删除"
                      aria-label="删除"
                      icon={<Trash2 />}
                      loading={deleteLoading}
                      disabled={actionLocked && !deleteLoading}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className={s.empty}>
            <FileText className="mx-auto mb-4 size-12 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">还没有简历</p>
            <Link href="/resume/templates">
              <Button icon={<Plus />}>创建第一份简历</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
