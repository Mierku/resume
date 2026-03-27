'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { RESUME_TEMPLATES } from '@/lib/constants'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAuthedPageData } from '@/lib/hooks/useAuthedPageData'

interface DataSource {
  id: string
  name: string
}

interface TemplateMeta {
  id: string
  name: string
  description: string
  preview?: string
  defaultPrimaryColor?: string
}

const BASE_THEME_COLORS = [
  { label: '海军蓝', value: '#2f4c72' },
  { label: '天空蓝', value: '#2f74ba' },
  { label: '青绿色', value: '#0f766e' },
  { label: '琥珀金', value: '#b45309' },
  { label: '莓红', value: '#be123c' },
  { label: '石墨灰', value: '#323f55' },
] as const

const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

export default function TemplatesPage() {
  const router = useRouter()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null)
  const [creating, setCreating] = useState(false)
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, boolean>>({})
  const [templateQuery, setTemplateQuery] = useState('')
  const [newResume, setNewResume] = useState({
    title: '',
    dataSourceId: '',
    themeColor: '',
  })

  const templates = useMemo(() => RESUME_TEMPLATES as TemplateMeta[], [])
  const filteredTemplates = useMemo(() => {
    const keyword = templateQuery.trim().toLowerCase()
    if (!keyword) return templates

    return templates.filter(template => {
      const name = template.name.toLowerCase()
      const description = template.description.toLowerCase()
      return name.includes(keyword) || description.includes(keyword)
    })
  }, [templates, templateQuery])
  const templateTags = useMemo(() => {
    if (!selectedTemplate) return []

    const descriptionTags = selectedTemplate.description
      .split(/[+＋、，,]/)
      .map(tag => tag.trim())
      .filter(Boolean)

    return Array.from(new Set([selectedTemplate.name, ...descriptionTags])).slice(0, 5)
  }, [selectedTemplate])

  const themeColorOptions = useMemo(() => {
    const templateDefaultColor = selectedTemplate?.defaultPrimaryColor || '#2f74ba'
    const basePalette = BASE_THEME_COLORS.filter(option => option.value !== templateDefaultColor)
    return [{ label: '模板默认', value: templateDefaultColor }, ...basePalette]
  }, [selectedTemplate])
  const selectedTemplateId = selectedTemplate?.id || ''
  const selectedTemplateName = selectedTemplate?.name || '模板'
  const selectedTemplatePreview = selectedTemplate?.preview || ''

  const loadDataSources = useCallback(
    async ({ signal, auth }: { signal: AbortSignal; auth: { authenticated: boolean } }) => {
      if (!auth.authenticated) {
        return []
      }

      const response = await fetch('/api/data-sources', { cache: 'no-store', signal })
      if (response.status === 401) {
        return []
      }

      if (!response.ok) {
        throw new Error('数据源加载失败')
      }

      const payload = await response.json().catch(() => null)
      if (!payload || typeof payload !== 'object') {
        return []
      }

      const dataSources = (payload as { dataSources?: unknown[] }).dataSources
      return Array.isArray(dataSources) ? (dataSources as DataSource[]) : []
    },
    [],
  )

  const { data: dataSources, auth } = useAuthedPageData<DataSource[]>({
    initialData: [],
    load: loadDataSources,
    onError: error => {
      console.error('Failed to fetch data sources:', error)
    },
  })
  const authenticated = auth.authenticated

  const enterGuestEditor = () => {
    if (!selectedTemplate) return
    const params = new URLSearchParams({
      template: selectedTemplate.id,
      title: newResume.title.trim(),
    })
    if (HEX_COLOR_PATTERN.test(newResume.themeColor)) {
      params.set('theme', newResume.themeColor)
    }

    const loadingToastId = toast.loading('正在进入编辑页...')
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('resume:editor-loading-toast-id', String(loadingToastId))
      window.sessionStorage.setItem('resume:guest-editor-entry', '1')
    }

    setShowCreateModal(false)
    router.push(`/resume/editor/new?${params.toString()}`)
  }

  const openCreateModal = (template: TemplateMeta) => {
    setSelectedTemplate(template)
    setNewResume({
      title: `${template.name} 简历`,
      dataSourceId: '',
      themeColor: template.defaultPrimaryColor || '#2f74ba',
    })
    setShowCreateModal(true)
  }

  const handleCreateResume = async () => {
    if (!selectedTemplate || !newResume.title.trim()) {
      toast.error('请填写简历标题')
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
          themeColor: newResume.themeColor || null,
          mode: 'form',
        }),
      })

      if (res.status === 401) {
        enterGuestEditor()
        return
      }

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || '创建失败')
        return
      }

      const data = await res.json()
      const loadingToastId = toast.loading('正在进入编辑页...')
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('resume:just-created-id', String(data.resume.id))
        window.sessionStorage.setItem('resume:editor-loading-toast-id', String(loadingToastId))
      }
      setShowCreateModal(false)
      router.push(`/resume/editor/${data.resume.id}`)
    } catch {
      toast.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] py-6 px-10">
      <div className="mb-4 max-w-[420px]">
        <Input
          value={templateQuery}
          onChange={event => setTemplateQuery(event.target.value)}
          placeholder="搜索模版：例如 蓝金、双语、极简"
          aria-label="搜索模版"
        />
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">热门模版库</h1>
        <p className="text-sm text-muted-foreground mt-1">按风格选择模板创建简历。</p>
      </div>

      {filteredTemplates.length > 0 ? (
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map(template => (
            <button
              key={template.id}
              type="button"
              className="group relative rounded-[12px] overflow-hidden border border-foreground/30 bg-background text-left transition-colors duration-200 hover:border-primary/65"
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

              <div className="p-3 border-t border-foreground/15 bg-muted/55">
                <h3 className="font-medium text-foreground text-sm transition-colors duration-200 group-hover:text-primary">{template.name}</h3>
                <p className="text-xs text-foreground/75 mt-1 line-clamp-2 transition-colors duration-200 group-hover:text-foreground">{template.description}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-border bg-muted/20 py-14 text-center">
          <p className="text-sm text-foreground">未找到匹配的模版</p>
          <p className="mt-1 text-xs text-muted-foreground">试试更短的关键词，或者清空后查看全部模版。</p>
        </div>
      )}

      <Modal
        title="创建简历"
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        panelClassName="max-w-[1120px] w-[min(1120px,calc(100vw-32px))] rounded-[10px]"
        contentClassName="text-foreground h-[min(620px,calc(100vh-250px))]"
        footerClassName="mt-4 border-t border-border pt-4"
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
              使用此模板
            </Button>
          </>
        }
      >
        <div className="grid h-full min-h-0 gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
          <div className="min-h-0 rounded-[10px] border border-border bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">简历预览</p>
              {selectedTemplate && (
                <span className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                  {selectedTemplate.name}
                </span>
              )}
            </div>

            <div className="relative h-[calc(100%-36px)] min-h-[320px] overflow-hidden rounded-[10px] border border-border/70 bg-background">
              {selectedTemplatePreview && !brokenPreviews[selectedTemplateId] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedTemplatePreview}
                  alt={`${selectedTemplateName} 预览`}
                  className="h-full w-full object-cover object-top"
                  loading="lazy"
                  decoding="async"
                  onError={() =>
                    setBrokenPreviews(prev => ({
                      ...prev,
                      [selectedTemplateId]: true,
                    }))
                  }
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                  预览图缺失
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto pr-1">
            <div className="space-y-4">
              {selectedTemplate && (
                <div className="rounded-[10px] border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium text-foreground">模板标签</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {templateTags.map(tag => (
                      <span key={tag} className="rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground border border-border/70">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{selectedTemplate.description}</p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">1. 主题颜色</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {themeColorOptions.map(option => {
                    const active = newResume.themeColor === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNewResume(prev => ({ ...prev, themeColor: option.value }))}
                        className={`rounded-[10px] border px-2 py-2 text-left transition-colors ${active ? 'border-foreground/70 bg-muted' : 'border-border bg-background hover:bg-muted/40'}`}
                      >
                        <span className="mb-1 inline-flex h-3 w-3 rounded-full border border-black/15" style={{ backgroundColor: option.value }} />
                        <span className="block truncate text-[11px] text-foreground">{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">2. 数据源选择</label>
                <Select
                  value={newResume.dataSourceId}
                  onChange={e => setNewResume(prev => ({ ...prev, dataSourceId: e.target.value }))}
                  disabled={!authenticated}
                  options={[
                    { value: '', label: authenticated ? '不选择数据源' : '游客模式不可选' },
                    ...dataSources.map(ds => ({ value: ds.id, label: ds.name })),
                  ]}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {authenticated ? '可先不选，进入编辑器后再执行一键填充。' : '游客模式可直接编辑，登录后可绑定数据源并填充。'}
                  {dataSources.length === 0 ? '首次创建且无数据源时，将自动填充一套示例内容。' : ''}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">3. 简历标题 *</label>
                <Input value={newResume.title} onChange={e => setNewResume(prev => ({ ...prev, title: e.target.value }))} placeholder="例如：前端工程师简历" />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
