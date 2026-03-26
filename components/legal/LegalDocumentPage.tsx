import type { LegalSection } from '@/lib/legal'
import styles from './legal-document.module.css'

interface LegalDocumentPageProps {
  title: string
  subtitle: string
  version: string
  effectiveDate: string
  sections: LegalSection[]
}

export function LegalDocumentPage({ title, subtitle, version, effectiveDate, sections }: LegalDocumentPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.kicker}>{subtitle}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>
            版本：{version} · 生效日期：{effectiveDate}
          </p>
        </header>

        <article className={styles.document}>
          {sections.map(section => (
            <section key={section.title} className={styles.section}>
              <h2>{section.title}</h2>
              {section.paragraphs.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
