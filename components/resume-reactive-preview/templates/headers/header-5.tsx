import type { CSSProperties } from 'react'
import type { HeaderRenderProps } from './types'
import styles from '../styles/headers/header-5.module.scss'

function resolveHeaderPhotoUrl(data: HeaderRenderProps['data']) {
  const url = String(data.picture.url || '').trim()
  if (!url || data.picture.hidden) return null
  return url
}

export function renderHeader5({ block, data, marginBottom, onNavigate, helpers }: HeaderRenderProps) {
  const paddingTop = typeof block.style.paddingTop === 'number' ? block.style.paddingTop : block.style.paddingY
  const paddingBottom = typeof block.style.paddingBottom === 'number' ? block.style.paddingBottom : block.style.paddingY
  const photoUrl = resolveHeaderPhotoUrl(data)
  const shellStyle: CSSProperties = {
    padding: `${paddingTop}px ${block.style.paddingX}px ${paddingBottom}px ${block.style.paddingX}px`,
    border: `${block.style.borderWidth}px solid ${block.style.borderColor}`,
    borderRadius: `${block.style.borderRadius}px`,
    background: block.style.backgroundColor,
    boxShadow: block.style.boxShadow,
    marginBottom: `${marginBottom}px`,
  }

  return (
    <article
      key={block.id}
      style={shellStyle}
      data-composed-block-id={block.id}
      className={helpers.cx(styles.h5Root, styles.h5Interactive)}
    >
      <div className={styles.h5Seal} aria-hidden="true">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={block.name || '证件照'} className={styles.h5SealImage} />
        ) : (
          <span className={styles.h5SealText}>{block.name || '简历'}</span>
        )}
      </div>

      <h1
        className={styles.h5Name}
        style={{
          color: block.style.titleColor,
          fontSize: `${block.style.nameFontSize}px`,
          lineHeight: block.style.nameLineHeight,
        }}
        {...helpers.getPreviewActionProps(onNavigate, { sectionId: block.sectionId, fieldKey: 'name' })}
      >
        {block.name}
      </h1>

      {block.headline ? (
        <p
          className={styles.h5Headline}
          style={{
            color: block.style.bodyColor,
            fontSize: `${block.style.headlineFontSize}px`,
            lineHeight: block.style.headlineLineHeight,
            marginTop: `${block.style.paragraphGap}px`,
          }}
          {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: block.headlineFieldKey })}
        >
          {block.headline}
        </p>
      ) : null}

      {block.meta.length > 0 ? (
        <p
          className={styles.h5Meta}
          style={{
            color: block.style.bodyColor,
            fontSize: `${block.style.metaFontSize}px`,
            lineHeight: block.style.metaLineHeight,
            marginTop: `${block.style.metaGap}px`,
          }}
        >
          <span className={styles.h5MetaText}>
            {block.meta.map((item, metaIndex) => (
              <span
                key={`${item.fieldKey}-${metaIndex}`}
                className={styles.h5MetaItem}
                {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey })}
              >
                {item.text}
                {metaIndex < block.meta.length - 1 ? <span className={styles.h5MetaSep}> • </span> : null}
              </span>
            ))}
          </span>
        </p>
      ) : null}
    </article>
  )
}
