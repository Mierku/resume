'use client'

import { useResumeBuilderStore } from '@/components/resume-builder/store/useResumeBuilderStore'

function formatClockTime(value?: number) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function SaveStatusTag() {
  const save = useResumeBuilderStore((state) => state.save)
  const dirty = useResumeBuilderStore((state) => state.dirty)

  const lastSavedTime = formatClockTime(save.lastSavedAt)

  if (save.status === 'saving') {
    return <span className="resume-save-status is-busy">正在保存...</span>
  }

  if (save.status === 'error') {
    return <span className="resume-save-status is-error">保存失败：{save.error || '未知错误'}</span>
  }

  if (dirty) {
    return <span className="resume-save-status">有未保存修改</span>
  }

  if (save.status === 'saved' && lastSavedTime) {
    return <span className="resume-save-status">云端已保存于 {lastSavedTime}</span>
  }

  return null
}
