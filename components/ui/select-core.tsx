'use client'

import { Popover } from '@base-ui/react/popover'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import {
  forwardRef,
  isValidElement,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type CSSProperties,
  type ReactNode,
} from 'react'

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
  ref,
) {
  const isControlled = value !== undefined
  const [innerValue, setInnerValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef(new Map<string, HTMLButtonElement>())
  const listboxId = useId()
  const canUsePortal = typeof document !== 'undefined'

  const currentValue = isControlled ? value ?? '' : innerValue

  const resolvedOptions = useMemo(
    () =>
      options.map(option => ({
        ...option,
        searchText: option.searchText || getSelectLabelText(option.label).toLowerCase(),
      })),
    [options],
  )

  const selectedOption = useMemo(
    () => resolvedOptions.find(option => option.value === currentValue),
    [currentValue, resolvedOptions],
  )

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return resolvedOptions
    return resolvedOptions.filter(option => option.searchText?.includes(keyword))
  }, [resolvedOptions, search])
  const enabledFilteredOptions = useMemo(() => filteredOptions.filter(option => !option.disabled), [filteredOptions])

  const canClear = allowClear && currentValue !== '' && !disabled
  const displayLabel = selectedOption?.label || currentValue || placeholder || ''
  const isPlaceholder = !selectedOption && currentValue === '' && Boolean(placeholder)

  const setValue = (nextValue: string) => {
    if (!isControlled) {
      setInnerValue(nextValue)
    }

    onValueChange?.(nextValue)
    setOpen(false)
    setSearch('')
  }

  const setOptionRef = (value: string, node: HTMLButtonElement | null) => {
    if (node) {
      optionRefs.current.set(value, node)
      return
    }

    optionRefs.current.delete(value)
  }

  const focusOptionByValue = (targetValue: string | undefined) => {
    if (!targetValue) return
    const target = optionRefs.current.get(targetValue)
    target?.focus()
    target?.scrollIntoView({ block: 'nearest' })
  }

  const focusSiblingOption = (currentValue: string, direction: 1 | -1) => {
    if (enabledFilteredOptions.length === 0) return

    const currentIndex = enabledFilteredOptions.findIndex(option => option.value === currentValue)
    const nextIndex = currentIndex === -1 ? 0 : Math.min(Math.max(currentIndex + direction, 0), enabledFilteredOptions.length - 1)
    focusOptionByValue(enabledFilteredOptions[nextIndex]?.value)
  }

  const getInitialFocusTarget = () => {
    return optionRefs.current.get(currentValue) || optionRefs.current.get(enabledFilteredOptions[0]?.value || '') || true
  }

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
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
      focusSiblingOption(option.value, 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusSiblingOption(option.value, -1)
    }
  }

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusOptionByValue(enabledFilteredOptions[0]?.value)
    }
  }

  const trigger = (
    <div className="resume-select-root relative w-full">
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}

      <Popover.Trigger
        ref={(node: HTMLElement | null) => {
          if (!ref) return
          if (typeof ref === 'function') {
            ref(node as HTMLButtonElement | null)
            return
          }

          ref.current = node as HTMLButtonElement | null
        }}
        id={id}
        type="button"
        aria-controls={listboxId}
        aria-haspopup="listbox"
        data-invalid={error ? 'true' : undefined}
        data-open={open ? 'true' : undefined}
        disabled={disabled}
        onKeyDown={handleTriggerKeyDown}
        className={cx(
          'control-field resume-select-trigger flex w-full items-center text-left text-sm text-foreground outline-none transition-all duration-200',
          canClear && 'has-clear',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
        style={style}
      >
        <span
          className={cx(
            'resume-select-trigger-content min-w-0 flex-1 truncate',
            isPlaceholder && 'text-muted-foreground',
          )}
        >
          {displayLabel || ' '}
        </span>
        <span className="resume-select-trigger-arrow" aria-hidden="true">
          <ChevronDown className="h-4 w-4" />
        </span>
      </Popover.Trigger>

      {canClear ? (
        <button
          type="button"
          aria-label="清空选择"
          className="resume-select-clear absolute top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
            setValue('')
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  )

  return (
    <Popover.Root
      open={open}
      onOpenChange={nextOpen => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setSearch('')
        }
      }}
    >
      {trigger}
      {canUsePortal ? (
        <Popover.Portal keepMounted>
          <Popover.Positioner
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={12}
            positionMethod="fixed"
            className="z-[120]"
            style={{
              width: 'var(--anchor-width)',
              maxWidth: 'var(--available-width)',
            }}
          >
            <Popover.Popup
              id={listboxId}
              role="listbox"
              initialFocus={showSearch ? searchRef : () => getInitialFocusTarget()}
              className="control-panel control-floating-panel resume-select-panel flex flex-col overflow-hidden"
              style={{
                maxHeight: 'min(320px, var(--available-height))',
              }}
              onPointerDown={event => {
                event.stopPropagation()
              }}
              onWheelCapture={event => {
                event.stopPropagation()
              }}
              onWheel={event => {
                event.stopPropagation()
              }}
            >
              <div className="flex min-h-0 max-h-full flex-col">
                {showSearch ? (
                  <div className="resume-select-search-wrap">
                    <label className="sr-only" htmlFor={`${listboxId}-search`}>
                      搜索选项
                    </label>
                    <div className="control-search resume-select-search flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        id={`${listboxId}-search`}
                        ref={searchRef}
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="搜索选项"
                        className="resume-select-search-input w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="resume-select-options min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map(option => {
                      const selected = option.value === currentValue

                      return (
                        <button
                          ref={node => setOptionRef(option.value, node)}
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
                            'control-option resume-select-option flex w-full items-center gap-3 text-left text-sm text-foreground',
                            option.disabled && 'cursor-not-allowed opacity-45',
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                          <span className="control-check resume-select-option-check flex h-4 w-4 items-center justify-center">
                            {selected ? <Check className="h-4 w-4" /> : null}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <div className="resume-select-empty px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</div>
                  )}
                </div>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      ) : null}
    </Popover.Root>
  )
})
