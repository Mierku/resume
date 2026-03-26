'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Zap } from 'lucide-react'

export function PluginSkeleton() {
  const [step, setStep] = useState<'idle' | 'popup' | 'filling' | 'done'>('idle')
  const [activeField, setActiveField] = useState<number | null>(null)
  const [filledFields, setFilledFields] = useState<number[]>([])
  const [pointerPos, setPointerPos] = useState({ x: '80%', y: '80%' })
  const [progress, setProgress] = useState(0)
  
  const extBtnRef = useRef<HTMLDivElement>(null)
  const fillBtnRef = useRef<HTMLButtonElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const getGlobalCenter = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const stageRect = stageRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height / 2,
    }
  }

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined
    const wait = (ms: number) =>
      new Promise<void>(resolve => {
        timer = setTimeout(resolve, ms)
      })

    const runDemo = async () => {
      // Reset
      setStep('idle')
      setActiveField(null)
      setFilledFields([])
      setProgress(0)
      setPointerPos({ x: '80%', y: '80%' })
      
      await wait(1500)

      // 1. 移动到插件图标
      if (extBtnRef.current) {
        const pos = getGlobalCenter(extBtnRef.current)
        setPointerPos({ x: `${pos.x}px`, y: `${pos.y}px` })
        await wait(1000)
        setStep('popup')
      }

      await wait(800)

      // 2. 移动到一键填写按钮
      if (fillBtnRef.current) {
        const pos = getGlobalCenter(fillBtnRef.current)
        setPointerPos({ x: `${pos.x}px`, y: `${pos.y}px` })
        await wait(1000)
        setStep('filling')
      }

      // 3. 填充动画
      const totalFields = 5
      for (let i = 0; i < totalFields; i++) {
        setActiveField(i)
        await wait(500)
        setFilledFields(prev => [...prev, i])
        setProgress(((i + 1) / totalFields) * 100)
      }

      setActiveField(null)
      setStep('done')

      await wait(3000)
      runDemo()
    }

    runDemo()
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [])

  return (
    <div 
      ref={stageRef}
      className="stage relative w-full max-w-[860px] h-[500px] bg-white rounded-lg shadow-xl border border-[rgba(10,10,11,0.12)] overflow-hidden mx-auto select-none scale-90 sm:scale-100"
    >
      {/* Chrome Top */}
      <div className="bg-[#f1f3f4] border-b border-[#dcdcdc]">
        <div className="h-10 flex items-center px-3 gap-2">
          <div className="flex gap-2 w-15">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c940]" />
          </div>
          <div className="bg-white h-8 px-4 rounded-t-lg flex items-center text-[11px] w-40 mt-2">
            沉浸式申请表单 <span className="ml-auto opacity-50 text-xs">×</span>
          </div>
          <div className="text-[#888] text-lg">+</div>
        </div>
        <div className="h-12 bg-white border-b border-[#dcdcdc] flex items-center px-4 gap-4">
          <div className="text-[#5f6368] text-sm tracking-[4px]">‹ › ↻</div>
          <div className="flex-1 h-8 bg-[#f1f3f4] rounded-full flex items-center px-4 text-xs text-[#5f6368]">
            https://jobs.company.com/apply...
          </div>
          <div 
            ref={extBtnRef}
            className={`w-8 h-8 rounded-sm flex items-center justify-center transition-all ${step !== 'idle' ? 'bg-primary' : 'bg-primary/80'}`}
          >
            <Zap className="size-4 text-white" />
          </div>
          <div className="text-[#5f6368]">⋮</div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-10 grid grid-cols-[1.2fr_1fr] gap-12">
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map(i => (
            <div 
              key={i}
              className={`
                h-7 border border-[#eee] rounded-[2px] bg-[#f8f9fa] relative transition-all duration-300
                ${i === 3 ? 'h-16' : ''}
                ${activeField === i ? 'border-primary ring-2 ring-primary/10' : ''}
                ${filledFields.includes(i) ? 'after:content-["••••••••"] after:absolute after:left-3 after:top-1/2 after:-translate-y-1/2 after:text-[#999] after:text-[10px]' : ''}
              `}
            />
          ))}
        </div>
        <div className="space-y-4">
          {[80, 60, 90].map((w, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-3 h-3 bg-[#eee] rounded-[2px] shrink-0" />
              <div className="h-3 bg-[#f5f5f5] rounded-[2px] flex-1" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Plugin Popup */}
      {(step === 'popup' || step === 'filling' || step === 'done') && (
        <div className="absolute top-[92px] right-4 w-60 bg-white rounded-sm border border-[#ddd] shadow-2xl z-20 animate-slide-up">
          <div className="p-3 border-b border-[#eee] flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
              <Zap className="size-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-[#333]">沉浸式填写</span>
          </div>
          
          <div className="p-4">
            {step === 'popup' ? (
              <div className="animate-fade-in">
                <div className="h-2 w-full bg-[#f0f0f0] rounded-[2px] mb-2" />
                <div className="h-2 w-[70%] bg-[#f5f5f5] rounded-[2px] mb-5" />
                <button 
                  ref={fillBtnRef}
                  className="w-full h-9 bg-primary text-white text-xs font-medium rounded-[2px] hover:bg-primary-hover transition-colors"
                >
                  一键填写
                </button>
              </div>
            ) : (
              <div className="text-center py-2 animate-fade-in">
                <div className="relative w-14 h-14 mx-auto mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle className="fill-none stroke-[#f0f0f0] stroke-[4]" cx="32" cy="32" r="28" />
                    <circle 
                      className="fill-none stroke-primary stroke-[4] transition-all duration-300" 
                      cx="32" cy="32" r="28"
                      strokeDasharray="176"
                      strokeDashoffset={176 - (176 * progress / 100)}
                    />
                  </svg>
                  {step === 'done' && (
                    <Check className="absolute inset-0 m-auto size-6 text-primary animate-fade-in" />
                  )}
                </div>
                <div className="text-[11px] text-[#666]">
                  {step === 'done' ? '填充已完成' : `正在填写第 ${activeField! + 1} 项...`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pointer */}
      <div 
        className="fixed w-5 h-6 pointer-events-none z-[9999] transition-all duration-700 ease-in-out"
        style={{ left: pointerPos.x, top: pointerPos.y, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
      >
        <svg viewBox="0 0 20 20" className="w-full h-full">
          <path d="M3,1 L17,11 L11,12 L15,18 L13,19 L9,13 L3,17 L3,1 Z" fill="black" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  )
}
