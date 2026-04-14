'use client'

import {
  Children,
  type CSSProperties,
  type InputHTMLAttributes,
  cloneElement,
  isValidElement,
  type ReactNode,
} from 'react'
import { toast } from '@/lib/toast'
import { Checkbox as UICheckbox } from '@/components/ui/checkbox'
import { Input as UIInput } from '@/components/ui/Input'
import { CustomSelect, getSelectLabelText, type CustomSelectOption } from '@/components/ui/select-core'
import { Textarea as UITextarea } from '@/components/ui/Textarea'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  ChevronDown,
  ChevronRight,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  Filter,
  GripVertical,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minus,
  Move,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
} from 'lucide-react'

type ButtonType = 'primary' | 'secondary' | 'outline' | 'text'
type ButtonSize = 'mini' | 'small' | 'default'

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type?: ButtonType
  size?: ButtonSize
  status?: 'danger'
  icon?: ReactNode
  long?: boolean
  loading?: boolean
}

const buttonTypeClasses: Record<ButtonType, string> = {
  primary: 'bg-primary text-white border border-primary hover:bg-primary-hover',
  secondary: 'bg-[var(--control-surface)] text-foreground border border-border hover:bg-[var(--control-hover-surface)]',
  outline: 'bg-[var(--control-surface)] text-foreground border border-border hover:bg-[var(--control-hover-surface)]',
  text: 'bg-transparent text-foreground border border-transparent hover:bg-[var(--control-hover-surface)]',
}

const buttonSizeClasses: Record<ButtonSize, string> = {
  mini: 'h-7 px-2 text-xs',
  small: 'h-8 px-3 text-xs',
  default: 'h-9 px-3.5 text-sm',
}

export function Button({
  type = 'primary',
  size = 'default',
  status,
  icon,
  className = '',
  children,
  long = false,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-sm transition-colors',
        buttonTypeClasses[type],
        buttonSizeClasses[size],
        status === 'danger' ? 'text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40' : '',
        long ? 'w-full' : '',
        disabled || loading ? 'opacity-60 cursor-not-allowed' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

interface InputBaseProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
}

function inputClass(className = '') {
  return ['text-sm', className].filter(Boolean).join(' ')
}

function InputBase({ value, onChange, placeholder, className, style, type = 'text', ...props }: InputBaseProps) {
  return (
    <UIInput
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      className={inputClass(className)}
      style={style}
      {...props}
    />
  )
}

interface TextAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoSize?: { minRows?: number; maxRows?: number }
}

function TextArea({ value, onChange, placeholder, className, autoSize }: TextAreaProps) {
  const rows = autoSize?.minRows || 4
  const maxRows = autoSize?.maxRows

  return (
    <UITextarea
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputClass(className)} resize-y`}
      style={maxRows ? { maxHeight: `${maxRows * 1.75}rem` } : undefined}
    />
  )
}

type InputComponent = typeof InputBase & {
  TextArea: typeof TextArea
}

export const Input = InputBase as InputComponent
Input.TextArea = TextArea

interface OptionProps {
  value: string
  children: ReactNode
  disabled?: boolean
}

export function Option(props: OptionProps) {
  void props
  return null
}

interface SelectProps {
  value: string | string[]
  onChange: (value: string | string[]) => void
  children: ReactNode
  mode?: 'multiple'
  placeholder?: string
  allowClear?: boolean
  style?: CSSProperties
}

export function Select({ value, onChange, children, mode, placeholder, allowClear, style }: SelectProps) {
  const isMultiple = mode === 'multiple'

  if (isMultiple) {
    return (
      <select
        multiple
        value={Array.isArray(value) ? value : []}
        onChange={event => {
          const values = Array.from(event.currentTarget.selectedOptions).map(option => option.value)
          onChange(values)
        }}
        className={`control-field control-native-select-field ${inputClass()} min-h-28`}
        style={style}
      >
        {children}
      </select>
    )
  }

  const singleValue = Array.isArray(value) ? value[0] || '' : value
  const options = Children.toArray(children).flatMap(child => collectSelectOptions(child))

  return (
    <CustomSelect
      value={singleValue}
      onValueChange={nextValue => onChange(nextValue)}
      className="text-sm"
      options={options}
      placeholder={placeholder}
      allowClear={allowClear}
      style={style}
      emptyText="没有可选项"
    />
  )
}

function collectSelectOptions(node: ReactNode): CustomSelectOption[] {
  if (!isValidElement<OptionProps & { children?: ReactNode }>(node)) {
    return []
  }

  if (node.type === Option) {
    return [
      {
        value: node.props.value,
        label: node.props.children,
        disabled: node.props.disabled,
        searchText: getSelectLabelText(node.props.children).toLowerCase(),
      },
    ]
  }

  if ('children' in node.props) {
    return Children.toArray(node.props.children).flatMap(child => collectSelectOptions(child))
  }

  return []
}

interface CheckboxProps {
  checked: boolean
  onChange: (value: boolean) => void
  className?: string
  disabled?: boolean
}

export function Checkbox({ checked, onChange, className, disabled }: CheckboxProps) {
  return <UICheckbox checked={checked} disabled={disabled} onCheckedChange={onChange} className={className} />
}

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  className?: string
}

export function Slider({ value, min, max, step = 1, onChange, className }: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={event => onChange(Number(event.target.value))}
      className={['w-full accent-primary', className].filter(Boolean).join(' ')}
    />
  )
}

export function Space({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['inline-flex items-center gap-1.5', className].filter(Boolean).join(' ')}>{children}</div>
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const title = typeof content === 'string' ? content : undefined
  return (
    <span title={title} className="inline-flex">
      {children}
    </span>
  )
}

interface TabPaneProps {
  title: ReactNode
  children?: ReactNode
}

function TabPane(_: TabPaneProps) {
  void _
  return null
}

interface TabsProps {
  activeTab: string
  onChange: (value: string) => void
  children: ReactNode
}

function TabsRoot({ activeTab, onChange, children }: TabsProps) {
  const panes = Children.toArray(children)
    .filter(isValidElement<TabPaneProps>)
    .map((child, index) => {
      const key = String(child.key ?? `tab-${index}`)
      const normalizedKey = key.startsWith('.$') ? key.slice(2) : key
      return {
        key: normalizedKey,
        title: child.props.title,
      }
    })

  return (
    <div className="border-b border-border px-4">
      <div className="flex gap-1 pt-2">
        {panes.map(pane => (
          <button
            key={pane.key}
            type="button"
            onClick={() => onChange(pane.key)}
            className={[
              'rounded-t-sm border border-b-0 px-3 py-2 text-sm',
              activeTab === pane.key
                ? 'border-border bg-background text-foreground'
                : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {pane.title}
          </button>
        ))}
      </div>
    </div>
  )
}

type TabsComponent = typeof TabsRoot & {
  TabPane: typeof TabPane
}

const Tabs = TabsRoot as TabsComponent
Tabs.TabPane = TabPane

interface CollapseItemProps {
  name: string
  header: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}

function CollapseItem({ header, children, defaultOpen }: CollapseItemProps) {
  return (
    <details open={defaultOpen} className="border-b border-border last:border-b-0">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm text-foreground [&::-webkit-details-marker]:hidden">
        {header}
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  )
}

interface CollapseProps {
  defaultActiveKey?: string[]
  children: ReactNode
}

function CollapseRoot({ defaultActiveKey = [], children }: CollapseProps) {
  const childrenArray = Children.toArray(children)
  return (
    <div className="rounded-sm border border-border">
      {childrenArray.map(child => {
        if (!isValidElement<CollapseItemProps>(child)) return child
        const key = String(child.key ?? child.props.name)
        const normalizedKey = key.startsWith('.$') ? key.slice(2) : key
        return cloneElement(child, {
          defaultOpen: defaultActiveKey.includes(normalizedKey),
        })
      })}
    </div>
  )
}

type CollapseComponent = typeof CollapseRoot & {
  Item: typeof CollapseItem
}

const Collapse = CollapseRoot as CollapseComponent
Collapse.Item = CollapseItem

export const Message = {
  success: (content: string) => toast.success(content),
  error: (content: string) => toast.error(content),
  warning: (content: string) => toast.warning(content),
}

export function IconDelete() {
  return <Trash2 className="h-4 w-4" />
}

function IconDownload() {
  return <Download className="h-4 w-4" />
}

export function IconLeft() {
  return <ArrowLeft className="h-4 w-4" />
}

export function IconPlus() {
  return <Plus className="h-4 w-4" />
}

function IconMinus() {
  return <Minus className="h-4 w-4" />
}

export function IconRefresh() {
  return <RefreshCw className="h-4 w-4" />
}

export function IconRedo() {
  return <Redo2 className="h-4 w-4" />
}

export function IconUndo() {
  return <Undo2 className="h-4 w-4" />
}

export function IconSave() {
  return <Save className="h-4 w-4" />
}

function IconMove() {
  return <Move className="h-4 w-4" />
}

export function IconGrip() {
  return <GripVertical className="h-4 w-4" />
}

function IconArrowUp() {
  return <ArrowUp className="h-4 w-4" />
}

function IconArrowDown() {
  return <ArrowDown className="h-4 w-4" />
}

function IconChevronDown() {
  return <ChevronDown className="h-4 w-4" />
}

export function IconChevronRight() {
  return <ChevronRight className="h-4 w-4" />
}

export function IconMaximize() {
  return <Maximize2 className="h-4 w-4" />
}

export function IconEye() {
  return <Eye className="h-4 w-4" />
}

function IconEyeOff() {
  return <EyeOff className="h-4 w-4" />
}

export function IconMoreHorizontal() {
  return <Ellipsis className="h-4 w-4" />
}

function IconSidebarOpen() {
  return <PanelLeftOpen className="h-4 w-4" />
}

function IconSidebarClose() {
  return <PanelLeftClose className="h-4 w-4" />
}

function IconFilter() {
  return <Filter className="h-4 w-4" />
}

function IconPin() {
  return <Pin className="h-4 w-4" />
}

export function IconBold() {
  return <Bold className="h-4 w-4" />
}

export function IconItalic() {
  return <Italic className="h-4 w-4" />
}

export function IconUnderline() {
  return <Underline className="h-4 w-4" />
}

export function IconOrderedList() {
  return <ListOrdered className="h-4 w-4" />
}

export function IconUnorderedList() {
  return <List className="h-4 w-4" />
}

export function IconStrikethrough() {
  return <Strikethrough className="h-4 w-4" />
}

export function IconLink() {
  return <LinkIcon className="h-4 w-4" />
}
