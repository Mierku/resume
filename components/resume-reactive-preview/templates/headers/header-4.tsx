import type { CSSProperties } from 'react'
import type { HeaderRenderProps } from './types'
import styles from '../styles/headers/header-4.module.scss'
import { HeaderPhoto } from './HeaderPhoto'

export function renderHeader4({ data, block, marginBottom, onNavigate, helpers }: HeaderRenderProps) {
  const paddingTop = 0
  const paddingBottom = typeof block.style.paddingBottom === 'number' ? block.style.paddingBottom : block.style.paddingY
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
      {...helpers.getPreviewActionProps(
        onNavigate,
        { sectionId: block.sectionId },
        helpers.cx(styles.h4Root, styles.h4Interactive),
      )}
    >
      <div className={styles.h4Content}>
        <HeaderPhoto data={data} onNavigate={onNavigate} helpers={helpers} />

        <h1
          className={styles.h4Name}
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
            className={styles.h4Headline}
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
            className={styles.h4Meta}
            style={{
              color: block.style.bodyColor,
              fontSize: `${block.style.metaFontSize}px`,
              lineHeight: block.style.metaLineHeight,
              marginTop: `${block.style.metaGap}px`,
            }}
          >
            {block.meta.map((item, metaIndex) => (
              <span
                key={`${item.fieldKey}-${metaIndex}`}
                className={styles.h4MetaItem}
                {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey })}
              >
                {item.text}
                {metaIndex < block.meta.length - 1 ? <span className={styles.h4MetaSep}> | </span> : null}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </article>
  )
}
