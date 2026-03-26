'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  IconBold,
  IconItalic,
  IconLink,
  IconOrderedList,
  IconStrikethrough,
  IconUnderline,
  IconUnorderedList,
  Button,
  Tooltip,
} from './primitives'
import { sanitizeHtml } from '@/lib/resume/sanitize'
import styles from './RichTextEditor.module.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

function command(commandName: string, value?: string) {
  if (typeof document === 'undefined') return
  document.execCommand(commandName, false, value)
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '请输入内容',
  minHeight = 120,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!editorRef.current) return

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const actions = useMemo(
    () => [
      {
        key: 'bold',
        icon: <IconBold />,
        title: '加粗',
        exec: () => command('bold'),
      },
      {
        key: 'italic',
        icon: <IconItalic />,
        title: '斜体',
        exec: () => command('italic'),
      },
      {
        key: 'underline',
        icon: <IconUnderline />,
        title: '下划线',
        exec: () => command('underline'),
      },
      {
        key: 'strike',
        icon: <IconStrikethrough />,
        title: '删除线',
        exec: () => command('strikeThrough'),
      },
      {
        key: 'unordered',
        icon: <IconUnorderedList />,
        title: '无序列表',
        exec: () => command('insertUnorderedList'),
      },
      {
        key: 'ordered',
        icon: <IconOrderedList />,
        title: '有序列表',
        exec: () => command('insertOrderedList'),
      },
      {
        key: 'link',
        icon: <IconLink />,
        title: '插入链接',
        exec: () => {
          const link = window.prompt('请输入链接地址（https://）')
          if (!link) return
          command('createLink', link)
        },
      },
    ],
    [],
  )

  const handleInput = () => {
    const html = editorRef.current?.innerHTML || ''
    onChange(html)
  }

  const handleBlur = () => {
    setIsFocused(false)
    const html = editorRef.current?.innerHTML || ''
    const sanitized = sanitizeHtml(html)
    if (editorRef.current && editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized
    }
    if (sanitized !== value) {
      onChange(sanitized)
    }
  }

  return (
    <div className={styles.editorRoot}>
      <div className={styles.toolbar}>
        {actions.map(action => (
          <Tooltip key={action.key} content={action.title}>
            <Button
              type="text"
              size="mini"
              icon={action.icon}
              onMouseDown={event => event.preventDefault()}
              onClick={action.exec}
            />
          </Tooltip>
        ))}
      </div>

      <div className={styles.contentWrap}>
        {!value && !isFocused ? (
          <div className={styles.placeholder}>{placeholder}</div>
        ) : null}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={`${styles.content} tiptap-content`}
          style={{ minHeight }}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
        />
      </div>
    </div>
  )
}
