import type { ResumeData } from '@/lib/resume/types'
import type { PreviewNavigationTarget, TemplateHelpers } from '../types'
import styles from '../styles/headers/header-photo.module.scss'

interface HeaderPhotoProps {
  data: ResumeData
  onNavigate?: (target: PreviewNavigationTarget) => void
  helpers: TemplateHelpers
}

export function HeaderPhoto({ data, onNavigate, helpers }: HeaderPhotoProps) {
  if (data.picture.hidden) {
    return null
  }

  const avatarSrc = String(data.picture.url || '').trim() || '/templates/shared/avatar-default.png'
  const avatarAlt = data.basics.name || '头像'

  return (
    <span
      {...helpers.getPreviewActionProps(
        onNavigate,
        { sectionId: 'basics', fieldKey: 'picture.url' },
        styles.photo,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatarSrc} alt={avatarAlt} className={styles.photoImage} />
    </span>
  )
}
