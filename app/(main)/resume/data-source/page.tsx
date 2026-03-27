'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Check, Database, Edit, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { AuthRequiredModal } from '@/components/ui/Modal'
import { toast } from '@/lib/toast'
import { useAuthedPageData } from '@/lib/hooks/useAuthedPageData'

interface DataSource {
  id: string
  name: string
  langMode: string
  basics: {
    nameZh?: string
    email?: string
  }
  updatedAt: string
}

interface User {
  defaultDataSourceId?: string
}

export default function DataSourceListPage() {
  const [showAuthModal, setShowAuthModal] = useState(false)

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
        throw new Error('数据源列表加载失败')
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

  const { data: dataSources, loading, auth, reload, ensureAuthenticated } = useAuthedPageData<DataSource[], User>({
    initialData: [],
    load: loadDataSources,
    onError: error => {
      console.error('Failed to fetch data sources:', error)
    },
  })

  const authenticated = auth.authenticated
  const user = auth.user

  const ensureAuthForAction = async (actionName: string) => {
    const authed = await ensureAuthenticated()
    if (authed) return true

    toast.message(`${actionName}需要先登录`)
    setShowAuthModal(true)
    return false
  }

  const handleSetDefault = async (id: string) => {
    if (!(await ensureAuthForAction('设置默认数据源'))) return

    try {
      const res = await fetch(`/api/data-sources/${id}/set-default`, { method: 'POST' })
      if (res.ok) {
        toast.success('已设为默认')
        reload()
      } else {
        toast.error('设置失败')
      }
    } catch {
      toast.error('设置失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await ensureAuthForAction('删除数据源'))) return
    if (!confirm('确定要删除这个数据源吗？关联的简历将取消关联。')) return

    try {
      const res = await fetch(`/api/data-sources/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('删除成功')
        reload()
      } else {
        const data = await res.json()
        toast.error(data.error || '删除失败')
      }
    } catch {
      toast.error('删除失败')
    }
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
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">数据源</h1>
              <p className="text-sm text-muted-foreground mt-1">
                管理您的个人信息，用于一键填充表单
              </p>
            </div>
            <Link href="/resume/data-source/new">
              <Button icon={<Plus />}>新建数据源</Button>
            </Link>
          </div>

          {dataSources.length > 0 ? (
            <div className="space-y-3">
              {dataSources.map(ds => (
                <Card key={ds.id} className="p-4 rounded-[12px]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{ds.name}</h3>
                        {user?.defaultDataSourceId === ds.id && (
                          <span className="pill-primary">默认</span>
                        )}
                        <span className="pill">{ds.langMode === 'zh' ? '中文' : 'English'}</span>
                      </div>
                      {ds.basics?.nameZh && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {ds.basics.nameZh} {ds.basics.email && `· ${ds.basics.email}`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        更新于 {formatDate(ds.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {user?.defaultDataSourceId !== ds.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleSetDefault(ds.id)}
                          title="设为默认"
                        >
                          <Check />
                        </Button>
                      )}
                      <Link href={`/resume/data-source/${ds.id}`}>
                        <Button variant="ghost" size="sm" title="编辑">
                          <Edit />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(ds.id)}
                        title="删除"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="mx-auto mb-4 size-12 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">还没有数据源</p>
              <Link href="/resume/data-source/new">
                <Button icon={<Plus />}>创建第一个数据源</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      <AuthRequiredModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath="/resume/data-source"
      />
    </>
  )
}
