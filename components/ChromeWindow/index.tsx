'use client'

import {
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  Puzzle,
  RotateCw,
  Settings2,
  User,
} from 'lucide-react'
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
          <span className={styles.favicon}>
          {title}
          </span>
        </div>
      </div>

      {/* 地址栏工具栏 */}
      <div className={styles.chromeToolbar}>
        <div className={styles.navIcons}>
          <span className={styles.navIcon} aria-hidden>
            <ArrowLeft />
          </span>
          <span className={styles.navIcon} aria-hidden>
            <ArrowRight />
          </span>
          <span className={styles.navIcon} aria-hidden>
            <RotateCw />
          </span>
        </div>
        <div className={styles.addressBar}>
          <div className={styles.lockIcon}>
            <Settings2 />
          </div>
          {url}
        </div>
        <div className={styles.pluginArea}>
          <div className={styles.pluginIcon} aria-hidden>
            <Puzzle />
          </div>
          <div className={styles.pluginIcon} aria-hidden>
            <User />
          </div>
          <div className={styles.pluginIcon} aria-hidden>
            <MoreVertical />
          </div>
        </div>
      </div>

      {/* 网页内容区 */}
      <div className={styles.webContent}>
        {children}
      </div>
    </div>
  )
}
