"use client";

import styles from "./styles.module.scss";

interface HollowGlowBackgroundProps {
  className?: string;
}

export function HollowGlowBackground({ className = "" }: HollowGlowBackgroundProps) {
  return (
    <div className={`${styles.background} ${className}`}>
      <div className={styles.baseGrid} />
      <div className={styles.topVignette} />
      <div className={styles.bottomVignette} />
    </div>
  );
}

interface HollowGlowTextProps {
  text: string;
  className?: string;
}

export function HollowGlowText({ text, className = "" }: HollowGlowTextProps) {
  return (
    <div className={`${styles.featherSource} ${className}`} data-text={text}>
      {text}
    </div>
  );
}
