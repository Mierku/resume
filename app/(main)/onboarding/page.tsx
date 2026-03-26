'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthGuard } from '@/components/AuthGuard'
import { Card } from '@/components/ui/Card'
import { Input, Button, Message } from '@/components/ui/radix-adapter'

const TextArea = Input.TextArea

type Step = 'data-source' | 'install' | 'tutorial'

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('data-source')
  const [loading, setLoading] = useState(false)
  const [dataSourceForm, setDataSourceForm] = useState({
    name: '我的数据源',
    nameZh: '',
    nameEn: '',
    email: '',
    phone: '',
    skills: '',
    summaryZh: '',
  })

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/onboarding/status')
        if (res.ok) {
          const data = await res.json()
          if (data.hasDataSource) setStep('install')
          if (data.completed) router.push('/dashboard')
        }
      } catch (error) {
        console.error('Failed to check status:', error)
      }
    }

    void checkStatus()
  }, [router])

  const handleCreateDataSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataSourceForm.name || !dataSourceForm.nameZh) {
      Message.error('请填写必填项')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dataSourceForm.name,
          basics: {
            nameZh: dataSourceForm.nameZh,
            nameEn: dataSourceForm.nameEn,
            email: dataSourceForm.email,
            phone: dataSourceForm.phone,
          },
          skills: dataSourceForm.skills.split(/[,，]/).map(s => s.trim()).filter(Boolean),
          summaryZh: dataSourceForm.summaryZh,
        }),
      })

      if (res.ok) {
        Message.success('数据源创建成功')
        setStep('install')
      } else {
        const data = await res.json()
        Message.error(data.error || '创建失败')
      }
    } catch {
      Message.error('创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST' })
      if (res.ok) {
        Message.success('引导完成！')
        router.push('/dashboard')
      } else {
        Message.error('完成引导失败')
      }
    } catch {
      Message.error('完成引导失败')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { id: 'data-source', label: '创建数据源', number: 1 },
    { id: 'install', label: '安装插件', number: 2 },
    { id: 'tutorial', label: '填报教程', number: 3 },
  ]

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">新手引导</h1>
        <p className="text-muted-foreground mb-8">
          完成以下步骤，开始使用沉浸式投递
        </p>

        {/* Progress steps */}
        <div className="flex items-center justify-between mb-8 px-4">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step === s.id 
                      ? 'bg-primary text-white' 
                      : steps.findIndex(x => x.id === step) > index
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {steps.findIndex(x => x.id === step) > index ? (
                    <span className="i-lucide-check w-4 h-4" />
                  ) : (
                    s.number
                  )}
                </div>
                <span className="text-xs text-muted-foreground mt-2">{s.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={`w-16 sm:w-24 h-0.5 mx-2 -mt-6
                    ${steps.findIndex(x => x.id === step) > index ? 'bg-primary/20' : 'bg-muted'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card className="p-6">
          {step === 'data-source' && (
            <form onSubmit={handleCreateDataSource} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">创建数据源</h2>
                <p className="text-sm text-muted-foreground">
                  数据源存储您的个人信息，用于一键填充表单
                </p>
              </div>

              <div>
                <label className="form-label">数据源名称 *</label>
                <Input
                  value={dataSourceForm.name}
                  onChange={v => setDataSourceForm(prev => ({ ...prev, name: v }))}
                  placeholder="例如：前端开发、产品经理"
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="form-label">中文姓名 *</label>
                  <Input
                    value={dataSourceForm.nameZh}
                    onChange={v => setDataSourceForm(prev => ({ ...prev, nameZh: v }))}
                    placeholder="张三"
                  />
                </div>
                <div>
                  <label className="form-label">英文名</label>
                  <Input
                    value={dataSourceForm.nameEn}
                    onChange={v => setDataSourceForm(prev => ({ ...prev, nameEn: v }))}
                    placeholder="San Zhang"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="form-label">邮箱</label>
                  <Input
                    type="email"
                    value={dataSourceForm.email}
                    onChange={v => setDataSourceForm(prev => ({ ...prev, email: v }))}
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="form-label">手机号</label>
                  <Input
                    value={dataSourceForm.phone}
                    onChange={v => setDataSourceForm(prev => ({ ...prev, phone: v }))}
                    placeholder="13800138000"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">技能（逗号分隔）</label>
                <Input
                  value={dataSourceForm.skills}
                  onChange={v => setDataSourceForm(prev => ({ ...prev, skills: v }))}
                  placeholder="JavaScript, React, Node.js"
                />
              </div>

              <div>
                <label className="form-label">个人简介</label>
                <TextArea
                  value={dataSourceForm.summaryZh}
                  onChange={v => setDataSourceForm(prev => ({ ...prev, summaryZh: v }))}
                  placeholder="简单介绍一下自己..."
                  autoSize={{ minRows: 3 }}
                />
              </div>

              <div className="flex justify-end">
                <Button type="primary" htmlType="submit" loading={loading}>
                  创建并继续
                </Button>
              </div>
            </form>
          )}

          {step === 'install' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">安装浏览器插件</h2>
                <p className="text-sm text-muted-foreground">
                  安装插件后，您可以在任意招聘网站使用一键填报功能
                </p>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Card hover className="flex items-center gap-3 p-4">
                    <span className="i-lucide-chrome w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Chrome</p>
                      <p className="text-xs text-muted-foreground">Chrome 网上应用店</p>
                    </div>
                  </Card>
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Card hover className="flex items-center gap-3 p-4">
                    <span className="i-lucide-globe w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Edge</p>
                      <p className="text-xs text-muted-foreground">Microsoft Edge 加载项</p>
                    </div>
                  </Card>
                </a>
              </div>

              <div className="p-4 bg-muted rounded-sm">
                <p className="text-sm text-muted-foreground">
                  安装后，点击浏览器工具栏中的插件图标，开启「沉浸式模式」开关。
                </p>
              </div>

              <div className="flex justify-between">
                <Button onClick={() => setStep('data-source')}>上一步</Button>
                <Button type="primary" onClick={() => setStep('tutorial')}>继续</Button>
              </div>
            </div>
          )}

          {step === 'tutorial' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">开始使用插件</h2>
                <p className="text-sm text-muted-foreground">
                  完成安装后，直接在支持的招聘网站岗位页使用一键填报和求职跟踪即可。
                </p>
              </div>

              <div className="p-4 border border-border rounded-sm">
                <ol className="text-sm text-muted-foreground space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>打开任意已支持的招聘网站岗位页</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>点击页面右下角的精灵球按钮，或使用插件弹窗中的「一键填报」和「求职跟踪」</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>保存记录后，可以在求职跟踪页统一查看后续进展</span>
                  </li>
                </ol>
              </div>

              <Link href="/job-sites">
                <Button type="primary" long>
                  查看支持网站
                </Button>
              </Link>

              <div className="flex justify-between pt-4">
                <Button onClick={() => setStep('install')}>上一步</Button>
                <Button type="primary" onClick={handleComplete} loading={loading}>完成引导</Button>
              </div>
            </div>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <button 
            onClick={handleComplete}
            className="hover:text-foreground transition-colors"
          >
            跳过引导
          </button>
        </p>
      </div>
    </div>
  )
}
