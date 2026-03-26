'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthGuard } from '@/components/AuthGuard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/lib/toast'

interface JobSite {
  id: string
  name: string
  url: string
  description?: string
  region?: string
  isBuiltIn: boolean
}

export default function JobSitesPage() {
  return (
    <AuthGuard>
      <JobSitesContent />
    </AuthGuard>
  )
}

function JobSitesContent() {
  const [sites, setSites] = useState<JobSite[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSite, setNewSite] = useState({ name: '', url: '', description: '', region: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/job-sites')
      if (res.ok) {
        const data = await res.json()
        setSites(data.sites || [])
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSite.name || !newSite.url) return

    setAdding(true)
    try {
      const res = await fetch('/api/job-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      })

      if (res.ok) {
        toast.success('添加成功')
        setShowAddModal(false)
        setNewSite({ name: '', url: '', description: '', region: '' })
        fetchSites()
      } else {
        const data = await res.json()
        toast.error(data.error || '添加失败')
      }
    } catch {
      toast.error('添加失败')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteSite = async (id: string) => {
    if (!confirm('确定要删除吗？')) return

    try {
      const res = await fetch(`/api/job-sites/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('删除成功')
        fetchSites()
      } else {
        const data = await res.json()
        toast.error(data.error || '删除失败')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const regions = Array.from(new Set(sites.map(s => s.region).filter(Boolean)))

  const filteredSites = sites.filter(site => {
    const matchSearch = !search || 
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.description?.toLowerCase().includes(search.toLowerCase())
    const matchRegion = !regionFilter || site.region === regionFilter
    return matchSearch && matchRegion
  })

  if (loading) {
    return (
      <div className="container pt-24 pb-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container pt-24 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">招聘网站管理</h1>
          <p className="text-sm text-muted-foreground mt-1">维护你的常用站点，便于在投递跟踪页快速跳转</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tracking">
            <Button variant="outline">
              返回跟踪页
            </Button>
          </Link>
          <Button onClick={() => setShowAddModal(true)}>
            <span className="i-lucide-plus w-4 h-4 mr-1" />
            添加网站
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="搜索网站..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          options={[
            { value: '', label: '全部地区' },
            ...regions.map(r => ({ value: r!, label: r! })),
          ]}
          className="w-full sm:w-40"
        />
      </div>

      <div className="mb-6 p-4 bg-muted rounded-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">插件使用说明</p>
          <p className="text-xs text-muted-foreground">安装并启用插件后，可在这些招聘网站的岗位页直接发起一键填报与跟踪</p>
        </div>
        <Link href="/install">
          <Button variant="outline" size="sm">
            查看安装说明
          </Button>
        </Link>
      </div>

      {/* Sites grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSites.map(site => (
          <Card key={site.id} className="relative group">
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    {site.name}
                    <span className="i-lucide-external-link w-3 h-3 text-muted-foreground" />
                  </h3>
                  {site.region && (
                    <span className="pill mt-1">{site.region}</span>
                  )}
                </div>
              </div>
              {site.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {site.description}
                </p>
              )}
            </a>
            {!site.isBuiltIn && (
              <button
                onClick={() => handleDeleteSite(site.id)}
                className="absolute top-2 right-2 p-1.5 bg-background border border-border rounded-sm opacity-0 group-hover:opacity-100 hover:border-red-500 hover:text-red-500 transition-all"
                title="删除"
              >
                <span className="i-lucide-trash-2 w-4 h-4" />
              </button>
            )}
          </Card>
        ))}
      </div>

      {filteredSites.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">没有找到匹配的网站</p>
        </div>
      )}

      {/* Quick link to records */}
      <div className="mt-8 text-center">
        <Link href="/tracking" className="text-sm text-primary hover:underline">
          查看投递跟踪
        </Link>
      </div>

      {/* Add modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="添加招聘网站"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button onClick={handleAddSite} loading={adding}>
              添加
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSite} className="space-y-4">
          <div>
            <label className="form-label">网站名称 *</label>
            <Input
              value={newSite.name}
              onChange={e => setNewSite(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例如：Boss直聘"
              required
            />
          </div>
          <div>
            <label className="form-label">网址 *</label>
            <Input
              type="url"
              value={newSite.url}
              onChange={e => setNewSite(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
              required
            />
          </div>
          <div>
            <label className="form-label">描述</label>
            <Input
              value={newSite.description}
              onChange={e => setNewSite(prev => ({ ...prev, description: e.target.value }))}
              placeholder="简短描述"
            />
          </div>
          <div>
            <label className="form-label">地区</label>
            <Input
              value={newSite.region}
              onChange={e => setNewSite(prev => ({ ...prev, region: e.target.value }))}
              placeholder="例如：全国、北京、海外"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
