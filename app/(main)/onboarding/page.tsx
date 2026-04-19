'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Chrome, Globe } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button, Message } from '@/components/ui/radix-adapter'
import { Skeleton } from '@/components/ui/Skeleton'
type Step = 'install' | 'tutorial'

export default function OnboardingPage() {
  return <OnboardingContent />
}

function OnboardingContent() {
  const router = useRouter()
  const pathname = usePathname()
  const [step, setStep] = useState<Step>('install')
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/onboarding/status', { cache: 'no-store' })
        if (res.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(pathname || '/onboarding')}`)
          return
        }

        if (res.ok) {
          const data = await res.json()
          if (data.completed) router.push('/dashboard')
        }
      } catch (error) {
        console.error('Failed to check status:', error)
      } finally {
        setBootstrapping(false)
      }
    }

    void checkStatus()
  }, [pathname, router])

  if (bootstrapping) {
    return (
      <div className="container py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-72 w-full rounded-[12px]" />
        </div>
      </div>
    )
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
    { id: 'install', label: '安装插件', number: 1 },
    { id: 'tutorial', label: '填报教程', number: 2 },
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
                    <Check className="size-4" />
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
                    <Chrome className="size-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Chrome</p>
                      <p className="text-xs text-muted-foreground">Chrome 网上应用店</p>
                    </div>
                  </Card>
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Card hover className="flex items-center gap-3 p-4">
                    <Globe className="size-8 text-primary" />
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
                <span />
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
