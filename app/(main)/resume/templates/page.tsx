'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { RESUME_TEMPLATES } from '@/lib/constants'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface DataSource {
  id: string
  name: string
}

interface TemplateMeta {
  id: string
  name: string
  description: string
  preview?: string
}

export default function TemplatesPage() {
  const router = useRouter()

  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [authChecked, setAuthChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null)
  const [creating, setCreating] = useState(false)
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, boolean>>({})
  const [newResume, setNewResume] = useState({
    title: '',
    dataSourceId: '',
  })

  const templates = useMemo(() => RESUME_TEMPLATES as TemplateMeta[], [])

  useEffect(() => {
    void fetchDataSources()
  }, [])

  const fetchDataSources = async () => {
    try {
      const [authRes, dataSourceRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/data-sources', { cache: 'no-store' }),
      ])

      const isAuthed = authRes.ok
      setAuthenticated(isAuthed)
      setAuthChecked(true)

      if (dataSourceRes.ok) {
        const data = await dataSourceRes.json()
        setDataSources(data.dataSources || [])
      } else {
        setDataSources([])
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error)
      setAuthenticated(false)
      setAuthChecked(true)
      setDataSources([])
    }
  }

  const ensureAuth = async () => {
    if (authenticated) return true
    if (authChecked) return false

    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      const isAuthed = res.ok
      setAuthenticated(isAuthed)
      setAuthChecked(true)
      return isAuthed
    } catch {
      setAuthenticated(false)
      setAuthChecked(true)
      return false
    }
  }

  const openCreateModal = (template: TemplateMeta) => {
    setSelectedTemplate(template)
    setNewResume({
      title: `${template.name} 简历`,
      dataSourceId: '',
    })
    setShowCreateModal(true)
  }

  const handleCreateResume = async () => {
    if (!selectedTemplate || !newResume.title.trim()) {
      toast.error('请填写简历标题')
      return
    }

    const isAuthed = await ensureAuth()
    if (!isAuthed) {
      const params = new URLSearchParams({
        template: selectedTemplate.id,
        title: newResume.title.trim(),
      })
      setShowCreateModal(false)
      toast.message('已进入游客编辑模式，仅支持在线编辑；云端保存、下载、填充需要登录。')
      router.push(`/resume/editor/new?${params.toString()}`)
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newResume.title,
          templateId: selectedTemplate.id,
          dataSourceId: newResume.dataSourceId || null,
          mode: 'form',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || '创建失败')
        return
      }

      const data = await res.json()
      toast.success('简历创建成功')
      router.push(`/resume/editor/${data.resume.id}`)
    } catch {
      toast.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">简历模板库</h1>
        <p className="text-sm text-muted-foreground mt-1">按风格选择模板创建简历。</p>
      </div>

      <div className="grid gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {templates.map(template => (
          <button
            key={template.id}
            type="button"
            className="group relative rounded-[12px] overflow-hidden border border-border bg-background text-left transition-colors duration-200 hover:border-primary/60"
            onClick={() => openCreateModal(template)}
          >
            <div className="aspect-[210/297] relative overflow-hidden bg-muted">
              {template.preview && !brokenPreviews[template.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${template.id}:${template.preview}`}
                  src={template.preview}
                  alt={template.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover"
                  onError={() =>
                    setBrokenPreviews(prev => ({
                      ...prev,
                      [template.id]: true,
                    }))
                  }
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">预览图缺失</div>
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="btn-primary">使用模板</span>
              </div>
            </div>

            <div className="p-3">
              <h3 className="font-medium text-foreground text-sm transition-colors duration-200 group-hover:text-primary">{template.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 transition-colors duration-200 group-hover:text-foreground">{template.description}</p>
            </div>
          </button>
        ))}
      </div>

      <Modal
        title="创建简历"
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)} disabled={creating}>
              取消
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateResume}
              loading={creating}
              className="bg-[var(--control-surface)] text-foreground hover:bg-[var(--control-hover-surface)] hover:text-foreground hover:border-border"
            >
              创建
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedTemplate && (
            <div className="p-3 rounded-[12px] border border-border bg-muted/40">
              <p className="text-sm text-foreground">模板：{selectedTemplate.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedTemplate.description}</p>
            </div>
          )}

          <div>
            <label className="text-sm text-foreground mb-1 block">简历标题 *</label>
            <Input value={newResume.title} onChange={e => setNewResume(prev => ({ ...prev, title: e.target.value }))} placeholder="例如：前端工程师简历" />
          </div>

          <div>
            <label className="text-sm text-foreground mb-1 block">数据源（可选）</label>
            <Select
              value={newResume.dataSourceId}
              onChange={e => setNewResume(prev => ({ ...prev, dataSourceId: e.target.value }))}
              disabled={!authenticated}
              options={[
                { value: '', label: authenticated ? '不选择数据源' : '游客模式不可选' },
                ...dataSources.map(ds => ({ value: ds.id, label: ds.name })),
              ]}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {authenticated ? '可先不选，进入编辑器后再执行一键填充。' : '游客模式可直接编辑，登录后可绑定数据源并填充。'}
              {dataSources.length === 0 ? '首次创建且无数据源时，将自动填充一套示例内容。' : ''}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
