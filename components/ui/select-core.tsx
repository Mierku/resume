'use client'

import { Check, ChevronDown, Search, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { useFloatingPanelPresence } from '@/components/ui/useFloatingPanelPresence'

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function nodeToText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(nodeToText).join('')
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeToText(node.props.children)
  }

  return ''
}

interface PanelPosition {
  left: number
  top: number
  width: number
  maxHeight: number
  placement: 'top' | 'bottom'
}

export interface CustomSelectOption {
  value: string
  label: ReactNode
  disabled?: boolean
  searchText?: string
}

export interface CustomSelectProps {
  value?: string
  defaultValue?: string
  options: CustomSelectOption[]
  onValueChange?: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  showSearch?: boolean
  disabled?: boolean
  error?: string
  emptyText?: string
  className?: string
  style?: CSSProperties
  name?: string
  id?: string
}

export function getSelectLabelText(label: ReactNode) {
  return nodeToText(label)
}

export const CustomSelect = forwardRef<HTMLButtonElement, CustomSelectProps>(function CustomSelect(
  {
    value,
    defaultValue = '',
    options,
    onValueChange,
    placeholder,
    allowClear = false,
    showSearch = false,
    disabled = false,
    error,
    emptyText = '没有匹配项',
    className,
    style,
    name,
    id,
  },
  ref
) {
  const isControlled = value !== undefined
  const [innerValue, setInnerValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const panelPresence = useFloatingPanelPresence(open)
  const listboxId = useId()
  const canUsePortal = typeof document !== 'undefined'

  const currentValue = isControlled ? value ?? '' : innerValue

  const resolvedOptions = useMemo(
    () =>
      options.map(option => ({
        ...option,
        searchText: option.searchText || getSelectLabelText(option.label).toLowerCase(),
      })),
    [options]
  )

  const selectedOption = useMemo(
    () => resolvedOptions.find(option => option.value === currentValue),
    [currentValue, resolvedOptions]
  )

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return resolvedOptions
    return resolvedOptions.filter(option => option.searchText?.includes(keyword))
  }, [resolvedOptions, search])

  const canClear = allowClear && currentValue !== '' && !disabled
  const displayLabel = selectedOption?.label || currentValue || placeholder || ''
  const isPlaceholder = !selectedOption && currentValue === '' && Boolean(placeholder)

  useEffect(() => {
    if (!open) return

    const updatePanelPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      const gap = 8
      const viewportPadding = 12
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const placement = spaceBelow < 220 && spaceAbove > spaceBelow ? 'top' : 'bottom'
      const availableHeight = placement === 'top' ? spaceAbove : spaceBelow

      setPanelPosition({
        left: rect.left,
        top: placement === 'top' ? rect.top - gap : rect.bottom + gap,
        width: rect.width,
        maxHeight: Math.max(160, Math.min(320, availableHeight - gap)),
        placement,
      })
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
      setSearch('')
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      setSearch('')
      triggerRef.current?.focus()
    }

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const timer = window.setTimeout(() => {
      if (showSearch) {
        searchRef.current?.focus()
        return
      }

      const selectedItem =
        panelRef.current?.querySelector<HTMLButtonElement>('[data-selected="true"]') ||
        panelRef.current?.querySelector<HTMLButtonElement>('[data-option="true"]:not([data-disabled="true"])')

      selectedItem?.focus()
      selectedItem?.scrollIntoView({ block: 'nearest' })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [filteredOptions, open, showSearch])

  const setValue = (nextValue: string) => {
    if (!isControlled) {
      setInnerValue(nextValue)
    }

    onValueChange?.(nextValue)
    setOpen(false)
    setSearch('')

    window.setTimeout(() => {
      triggerRef.current?.focus()
    }, 0)
  }

  const focusSiblingOption = (current: HTMLElement, direction: 1 | -1) => {
    const focusableOptions = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-option="true"]:not([data-disabled="true"])') || []
    )

    if (focusableOptions.length === 0) return

    const currentIndex = focusableOptions.findIndex(option => option === current)
    const nextIndex = currentIndex === -1 ? 0 : Math.min(Math.max(currentIndex + direction, 0), focusableOptions.length - 1)
    focusableOptions[nextIndex]?.focus()
    focusableOptions[nextIndex]?.scrollIntoView({ block: 'nearest' })
  }

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return

    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, option: CustomSelectOption) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!option.disabled) {
        setValue(option.value)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusSiblingOption(event.currentTarget, 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusSiblingOption(event.currentTarget, -1)
    }
  }

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const firstOption = panelRef.current?.querySelector<HTMLButtonElement>('[data-option="true"]:not([data-disabled="true"])')
      firstOption?.focus()
    }
  }

  const trigger = (
    <div ref={rootRef} className="relative">
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}

      <button
        ref={node => {
          triggerRef.current = node

          if (!ref) return
          if (typeof ref === 'function') {
            ref(node)
            return
          }

          ref.current = node
        }}
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        data-open={open ? 'true' : undefined}
        data-invalid={error ? 'true' : undefined}
        disabled={disabled}
        onClick={() => setOpen(previous => !previous)}
        onKeyDown={handleTriggerKeyDown}
        className={cx(
          'control-field flex h-9 w-full items-center px-3 text-left text-sm text-foreground outline-none transition-all duration-200',
          canClear ? 'pr-11' : 'pr-9',
          disabled && 'cursor-not-allowed opacity-60',
          className
        )}
        style={style}
      >
        <span className={cx('min-w-0 flex-1 truncate', isPlaceholder && 'text-muted-foreground')}>
          {displayLabel || ' '}
        </span>
      </button>

      {canClear ? (
        <button
          type="button"
          aria-label="清空选择"
          className="absolute right-8 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={event => {
            event.stopPropagation()
            setValue('')
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <span className="pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 text-muted-foreground">
        <ChevronDown className={cx('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
      </span>

      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  )

  if (!canUsePortal) {
    return trigger
  }

  const panelStyle: CSSProperties & Record<'--control-panel-anchor-transform', string> = {
    position: 'fixed',
    left: panelPosition?.left ?? 0,
    top: panelPosition?.top ?? 0,
    width: panelPosition?.width ?? 0,
    maxHeight: panelPosition?.maxHeight ?? 0,
    '--control-panel-anchor-transform': panelPosition?.placement === 'top' ? 'translateY(-100%)' : 'translateY(0px)',
  }

  return (
    <>
      {trigger}
      {panelPresence.mounted && panelPosition
        ? createPortal(
            <div
              ref={panelRef}
              id={listboxId}
              role="listbox"
              className="control-panel control-floating-panel z-[120] flex flex-col overflow-hidden"
              data-panel-state={panelPresence.phase}
              data-panel-placement={panelPosition.placement}
              aria-hidden={!open}
              onPointerDown={event => {
                event.stopPropagation()
              }}
              onWheelCapture={event => {
                event.stopPropagation()
              }}
              onWheel={event => {
                event.stopPropagation()
              }}
              style={panelStyle}
            >
              <div className="flex min-h-0 max-h-full flex-col">
                {showSearch ? (
                  <div className="border-b border-border px-2 py-2">
                    <label className="sr-only" htmlFor={`${listboxId}-search`}>
                      搜索选项
                    </label>
                    <div className="control-search flex items-center gap-2 px-2.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        id={`${listboxId}-search`}
                        ref={searchRef}
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="搜索选项"
                        className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map(option => {
                      const selected = option.value === currentValue

                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          data-option="true"
                          data-selected={selected}
                          data-disabled={option.disabled || undefined}
                          disabled={option.disabled}
                          onClick={() => {
                            if (!option.disabled) {
                              setValue(option.value)
                            }
                          }}
                          onKeyDown={event => handleOptionKeyDown(event, option)}
                          className={cx(
                            'control-option flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-foreground',
                            option.disabled && 'cursor-not-allowed opacity-45'
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                          <span className="control-check flex h-4 w-4 items-center justify-center">
                            {selected ? <Check className="h-4 w-4" /> : null}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
})
