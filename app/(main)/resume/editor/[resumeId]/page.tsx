import { Suspense } from 'react'
import { ResumeEditorPageClient } from '@/components/resume-builder/ResumeEditorPageClient'

export default function ResumeEditorPage() {
  return (
    <Suspense fallback={null}>
      <ResumeEditorPageClient />
    </Suspense>
  )
}
