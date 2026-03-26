'use client'

import styles from './ChromeWindow.module.scss'

interface ChromeWindowProps {
  title?: string
  url?: string
  children?: React.ReactNode
  className?: string
}

export function ChromeWindow({ 
  title = 'Matrix Resume Builder', 
  url = 'matrix-resume.io/dashboard',
  children,
  className = ''
}: ChromeWindowProps) {
  return (
    <div className={`${styles.chromeWindow} ${className}`}>
      {/* 顶部标签栏 */}
      <div className={styles.chromeHeader}>
        <div className={styles.trafficLights}>
          <div className={`${styles.light} ${styles.red}`} />
          <div className={`${styles.light} ${styles.yellow}`} />
          <div className={`${styles.light} ${styles.green}`} />
        </div>
        <div className={styles.chromeTab}>
          <span className={styles.favicon}>🔖</span>
          {title}
        </div>
      </div>

      {/* 地址栏工具栏 */}
      <div className={styles.chromeToolbar}>
        <div className={styles.navIcons}>
          <span>‹</span>
          <span>›</span>
          <span className={styles.refresh}>↻</span>
        </div>
        <div className={styles.addressBar}>
          <span className={styles.lock}>🔒</span>
          {url}
        </div>
        <div className={styles.pluginArea}>
          <div className={styles.pluginIcon}>🧩</div>
          <div className={styles.pluginIcon}>👤</div>
          <div className={styles.pluginIcon}>⋮</div>
        </div>
      </div>

      {/* 网页内容区 */}
      <div className={styles.webContent}>
        {children}
      </div>
    </div>
  )
}
