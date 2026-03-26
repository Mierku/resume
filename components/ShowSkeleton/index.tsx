'use client'

import { useEffect, useRef } from 'react'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function ShowSkeleton() {
  const stageRef = useRef<HTMLDivElement>(null)
  const extBtnRef = useRef<HTMLDivElement>(null)
  const fillBtnRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const initViewRef = useRef<HTMLDivElement>(null)
  const hudViewRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<SVGCircleElement>(null)
  const checkRef = useRef<SVGPathElement>(null)
  const hudTextRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    const getGlobalCenter = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      const stageRect = stageRef.current?.getBoundingClientRect()
      return {
        x: rect.left - (stageRect?.left || 0) + rect.width / 2,
        y: rect.top - (stageRect?.top || 0) + rect.height / 2,
      }
    }

    const movePointer = async (targetEl: HTMLElement) => {
      const ptr = pointerRef.current
      if (!ptr) return
      const pos = getGlobalCenter(targetEl)
      ptr.style.transition = 'all 0.8s cubic-bezier(0.45, 0, 0.55, 1)'
      ptr.style.left = `${pos.x}px`
      ptr.style.top = `${pos.y}px`
      await sleep(850)
    }

    const resetAll = () => {
      const popup = popupRef.current
      const initView = initViewRef.current
      const hudView = hudViewRef.current
      const pCircle = progressRef.current
      const checkIcon = checkRef.current
      const ptr = pointerRef.current
      if (popup) popup.style.display = 'none'
      if (initView) initView.style.display = 'block'
      if (hudView) hudView.style.display = 'none'
      if (pCircle) {
        pCircle.style.display = 'block'
        pCircle.style.strokeDashoffset = '126'
      }
      if (checkIcon) {
        checkIcon.style.opacity = '0'
        checkIcon.style.strokeDashoffset = '40'
      }
      if (ptr) {
        ptr.style.left = '80%'
        ptr.style.top = '80%'
      }
      stageRef.current
        ?.querySelectorAll<HTMLDivElement>('.field')
        .forEach((f) => {
          f.classList.remove('active', 'done')
        })
    }

    const runAutoDemo = async () => {
      resetAll()
      await sleep(1500)
      if (cancelled) return

      const extBtn = extBtnRef.current
      if (extBtn) {
        await movePointer(extBtn)
        extBtn.style.transform = 'scale(0.9)'
        await sleep(100)
        extBtn.style.transform = 'scale(1)'
      }

      if (popupRef.current) {
        popupRef.current.style.display = 'block'
      }
      await sleep(600)

      const fillBtn = fillBtnRef.current
      if (fillBtn) {
        await movePointer(fillBtn)
        fillBtn.style.background = '#1557b0'
      }
      await sleep(150)

      if (initViewRef.current) initViewRef.current.style.display = 'none'
      if (hudViewRef.current) hudViewRef.current.style.display = 'block'

      const fields = Array.from(
        stageRef.current?.querySelectorAll<HTMLDivElement>('.field') || []
      )

      for (let i = 0; i < fields.length; i++) {
        if (cancelled) return
        fields[i].classList.add('active')
        if (hudTextRef.current) {
          hudTextRef.current.innerText = `正在填写第 ${i + 1} 项...`
        }

        const offset = 126 - 126 * ((i + 1) / fields.length)
        if (progressRef.current) {
          progressRef.current.style.transition = 'stroke-dashoffset 0.4s ease'
          progressRef.current.style.strokeDashoffset = String(offset)
        }

        await sleep(500)
        fields[i].classList.remove('active')
        fields[i].classList.add('done')
      }

      if (hudTextRef.current) hudTextRef.current.innerText = '填充已完成'
      if (progressRef.current) progressRef.current.style.display = 'none'
      if (checkRef.current) {
        checkRef.current.style.opacity = '1'
        checkRef.current.style.transition = 'all 0.4s'
        checkRef.current.style.strokeDashoffset = '0'
      }

      await sleep(3000)
      if (!cancelled) runAutoDemo()
    }

    runAutoDemo()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="showcase">
      <div className="stage" ref={stageRef}>
        <div className="chrome-top">
          <div className="row1">
            <div className="traffic-lights">
              <div className="light red" />
              <div className="light yellow" />
              <div className="light green" />
            </div>
            <div className="tab">
              沉浸式申请表单 <span className="tab-close">×</span>
            </div>
            <div className="tab-plus">+</div>
          </div>
          <div className="row2">
            <div className="nav-icons">‹ › ↻</div>
            <div className="address-bar">
              https://jobs.apple.com/zh-cn/details/2005...
            </div>
            <div className="ext-btn" ref={extBtnRef}>
              <svg viewBox="0 0 24 24">
                <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
              </svg>
            </div>
            <div className="tab-more">⋮</div>
          </div>
        </div>

        <div className="content">
          <div id="formFields">
            <div className="field" />
            <div className="field" />
            <div className="field" />
            <div className="field textarea" />
            <div className="field" />
          </div>
          <div className="sidebar">
            <div className="bullet">
              <div className="bullet-dot" />
              <div className="bullet-line bullet-80" />
            </div>
            <div className="bullet">
              <div className="bullet-dot" />
              <div className="bullet-line bullet-60" />
            </div>
            <div className="bullet">
              <div className="bullet-dot" />
              <div className="bullet-line bullet-90" />
            </div>
          </div>
        </div>

        <div className="popup" ref={popupRef}>
          <div className="popup-header">
            <div className="logo">
              <svg viewBox="0 0 24 24">
                <path d="M13 3h-2v10h2V3z" />
              </svg>
            </div>
            <div className="popup-title">沉浸式填写</div>
          </div>
          <div className="popup-body">
            <div id="initView" ref={initViewRef}>
              <div className="mini-line mini-line-full" />
              <div className="mini-line mini-line-short" />
              <button className="fill-btn" id="fillBtn" ref={fillBtnRef}>
                一键填写
              </button>
            </div>
            <div className="hud-view" id="hudView" ref={hudViewRef}>
              <div className="progress-container">
                <svg className="progress-svg" width="60" height="60">
                  <circle className="progress-bg" cx="30" cy="30" r="20" />
                  <circle
                    ref={progressRef}
                    className="progress-bar"
                    cx="30"
                    cy="30"
                    r="20"
                  />
                </svg>
                <svg className="check-svg" viewBox="0 0 24 24">
                  <path
                    ref={checkRef}
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="hud-text" ref={hudTextRef}>
                正在解析表单...
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer" ref={pointerRef}>
        <svg viewBox="0 0 20 20">
          <path
            d="M3,1 L17,11 L11,12 L15,18 L13,19 L9,13 L3,17 L3,1 Z"
            fill="black"
            stroke="white"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <style jsx>{`
        .showcase {
          --chrome-bg: #f1f3f4;
          --chrome-border: #dcdcdc;
          --primary-blue: #1a73e8;
          --text-main: #3c4043;
          --skeleton-base: #f8f9fa;
          --skeleton-shimmer: #eeeeee;
          --radius: 2px;
          position: relative;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: var(--font-family-base);
        }

        .showcase * {
          box-sizing: border-box;
          cursor: none !important;
        }

        .stage {
          width: 860px;
          height: 540px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.12);
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--chrome-border);
          transform: scale(0.92);
          transform-origin: center;
        }

        .chrome-top {
          background: var(--chrome-bg);
          user-select: none;
        }

        .row1 {
          height: 40px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 8px;
        }
        .traffic-lights {
          display: flex;
          gap: 8px;
          width: 60px;
        }
        .light {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        .red {
          background: #ff5f57;
        }
        .yellow {
          background: #ffbd2e;
        }
        .green {
          background: #28c940;
        }
        .tab {
          background: white;
          height: 32px;
          padding: 0 16px;
          border-radius: 8px 8px 0 0;
          display: flex;
          align-items: center;
          font-size: 12px;
          width: 180px;
          margin-top: 8px;
          border-bottom: none;
        }
        .tab-close {
          margin-left: auto;
          opacity: 0.5;
          font-size: 14px;
        }
        .tab-plus {
          font-size: 20px;
          color: #888;
        }

        .row2 {
          height: 48px;
          background: white;
          border-bottom: 1px solid var(--chrome-border);
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 14px;
        }
        .nav-icons {
          color: #5f6368;
          font-size: 20px;
          letter-spacing: 8px;
        }
        .address-bar {
          flex: 1;
          height: 32px;
          background: var(--chrome-bg);
          border-radius: 16px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          font-size: 13px;
          color: #5f6368;
        }
        .ext-btn {
          width: 32px;
          height: 32px;
          background: var(--primary-blue);
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: transform 0.1s, background 0.2s;
        }
        .ext-btn svg {
          width: 18px;
          height: 18px;
          fill: white;
        }
        .tab-more {
          color: #5f6368;
          font-size: 18px;
        }

        .content {
          flex: 1;
          padding: 50px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 60px;
        }
        .field {
          height: 26px;
          margin-bottom: 18px;
          background: var(--skeleton-base);
          border-radius: var(--radius);
          border: 1px solid #eee;
          position: relative;
          overflow: hidden;
        }
        .field.textarea {
          height: 60px;
        }
        .field.active {
          border-color: var(--primary-blue);
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
        }
        .field.done::after {
          content: "· · · · · · · · · ";
          position: absolute;
          left: 10px;
          line-height: 24px;
          font-size: 11px;
          color: #999;
          letter-spacing: 1px;
        }

        .popup {
          position: absolute;
          top: 88px;
          right: 15px;
          width: 260px;
          background: white;
          border-radius: 4px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          border: 1px solid #ddd;
          display: none;
          z-index: 1000;
        }
        .popup-header {
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo {
          width: 24px;
          height: 24px;
          background: var(--primary-blue);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo svg {
          width: 14px;
          fill: white;
        }
        .popup-title {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .popup-body {
          padding: 20px 16px;
        }
        .fill-btn {
          width: 100%;
          height: 38px;
          background: var(--primary-blue);
          color: white;
          border: none;
          border-radius: var(--radius);
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .mini-line {
          height: 10px;
          border-radius: 2px;
          background: #f0f0f0;
          margin-bottom: 8px;
        }
        .mini-line-short {
          width: 70%;
          background: #f5f5f5;
          margin-bottom: 20px;
        }
        .mini-line-full {
          width: 100%;
        }

        .hud-view {
          display: none;
          text-align: center;
          padding: 10px 0;
        }
        .progress-container {
          width: 60px;
          height: 60px;
          margin: 0 auto 15px;
          position: relative;
        }
        .progress-svg {
          transform: rotate(-90deg);
        }
        .progress-bg {
          fill: none;
          stroke: #f0f0f0;
          stroke-width: 4;
        }
        .progress-bar {
          fill: none;
          stroke: var(--primary-blue);
          stroke-width: 4;
          stroke-dasharray: 126;
          stroke-dashoffset: 126;
        }
        .check-svg {
          position: absolute;
          top: 18px;
          left: 18px;
          width: 24px;
          opacity: 0;
          stroke: var(--primary-blue);
          stroke-width: 4;
          fill: none;
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
        }
        .hud-text {
          font-size: 12px;
          color: #666;
        }

        .pointer {
          position: absolute;
          width: 18px;
          height: 22px;
          pointer-events: none;
          z-index: 9999;
          filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3));
          left: 80%;
          top: 80%;
        }

        .bullet {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .bullet-dot {
          width: 12px;
          height: 12px;
          background: #eee;
          border-radius: 2px;
        }
        .bullet-line {
          height: 12px;
          background: #f5f5f5;
          border-radius: 2px;
          flex: 1;
        }
        .bullet-80 {
          width: 80%;
        }
        .bullet-60 {
          width: 60%;
        }
        .bullet-90 {
          width: 90%;
        }

        @media (max-width: 1024px) {
          .stage {
            transform: scale(0.8);
          }
        }

        @media (max-width: 768px) {
          .stage {
            transform: scale(0.7);
          }
        }
      `}</style>
    </div>
  )
}
