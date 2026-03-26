'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Copy, Edit, FileText, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/lib/toast'
import { RESUME_TEMPLATES } from '@/lib/constants'
import { AuthGuard } from '@/components/AuthGuard'
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

export default function MyResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResumes()
  }, [])

  const fetchResumes = async () => {
    try {
      const res = await fetch('/api/resumes')
      if (res.ok) {
        const data = await res.json()
        setResumes(data.resumes || [])
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/resumes/${id}/duplicate`, { method: 'POST' })
      if (res.ok) {
        toast.success('复制成功')
        fetchResumes()
      } else {
        toast.error('复制失败')
      }
    } catch {
      toast.error('复制失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这份简历吗？')) return

    try {
      const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('删除成功')
        fetchResumes()
      } else {
        toast.error('删除失败')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const getTemplateName = (templateId: string) => {
    return RESUME_TEMPLATES.find(t => t.id === templateId)?.name || RESUME_TEMPLATES[0]?.name || '商务蓝双栏'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <AuthGuard>
      {loading ? (
        <div className={s.page}>
          <Skeleton className="h-8 w-32" />
          <div className={s.grid}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-44 rounded-[12px]" />
            ))}
          </div>
        </div>
      ) : (
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
              {resumes.map(resume => (
                <article key={resume.id} className={s.card}>
                  <div className={s.cardHead}>
                    <div className={s.titleWrap}>
                      <h3 className={s.title}>{resume.title}</h3>
                      <p className={s.meta}>{getTemplateName(resume.templateId)}</p>
                    </div>
                    <span className={s.chip}>简历</span>
                  </div>

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
                    >
                      <Copy />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={s.iconBtn}
                      onClick={() => handleDelete(resume.id)}
                      title="删除"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              ))}
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
      )}
    </AuthGuard>
  )
}
