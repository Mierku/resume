'use client'

import {
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  Children,
  isValidElement,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { CustomSelect, getSelectLabelText, type CustomSelectOption } from '@/components/ui/select-core'

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

type FormHandle = Record<string, never>

interface FormProps {
  children: ReactNode
  layout?: 'vertical' | 'horizontal'
  autoComplete?: string
  form?: FormHandle
}

interface FormItemProps {
  children: ReactNode
  label?: ReactNode
  required?: boolean
  style?: CSSProperties
}

function FormRoot({ children, autoComplete, layout }: FormProps) {
  return (
    <form
      data-layout={layout || 'vertical'}
      autoCorrect="off"
      autoComplete={autoComplete}
      onSubmit={event => event.preventDefault()}
      className={cx(layout === 'horizontal' && 'flex flex-col gap-4')}
    >
      {children}
    </form>
  )
}

function FormItem({ children, label, required, style }: FormItemProps) {
  return (
    <div style={style}>
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
      ) : null}
      {children}
    </div>
  )
}

type FormComponent = typeof FormRoot & {
  Item: typeof FormItem
  useForm: () => [FormHandle]
}

export const Form = FormRoot as FormComponent
Form.Item = FormItem
Form.useForm = () => [{}]

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
}

function InputBase({ value = '', onChange, className, type = 'text', ...props }: InputProps) {
  return (
    <input
      value={value}
      type={type}
      onChange={event => onChange?.(event.target.value)}
      className={cx(
        'control-field h-9 w-full px-3 text-sm text-foreground outline-none',
        className,
      )}
      {...props}
    />
  )
}

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  autoSize?: {
    minRows?: number
    maxRows?: number
  }
}

function TextArea({ value = '', onChange, autoSize, className, rows = 3, ...props }: TextAreaProps) {
  const computedRows = autoSize?.minRows || rows
  const maxRows = autoSize?.maxRows

  return (
    <textarea
      value={value}
      rows={computedRows}
      onChange={event => onChange?.(event.target.value)}
      className={cx(
        'control-field w-full px-3 py-2 text-sm text-foreground outline-none',
        className,
      )}
      style={maxRows ? { maxHeight: `${maxRows * 1.75}rem` } : undefined}
      {...props}
    />
  )
}

interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  compact?: boolean
  children: ReactNode
}

function InputGroup({ compact = false, className, style, children, ...props }: InputGroupProps) {
  return (
    <div
      data-compact={compact ? 'true' : undefined}
      className={cx('control-group flex items-center', compact ? 'gap-0' : 'gap-2', className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

type InputComponent = typeof InputBase & {
  TextArea: typeof TextArea
  Group: typeof InputGroup
}

export const Input = InputBase as InputComponent
Input.TextArea = TextArea
Input.Group = InputGroup

interface OptionProps {
  value: string
  children: ReactNode
  disabled?: boolean
}

function Option(props: OptionProps) {
  void props
  return null
}

function collectOptions(children: ReactNode): CustomSelectOption[] {
  const options: CustomSelectOption[] = []

  Children.forEach(children, child => {
    if (!isValidElement<OptionProps & { children?: ReactNode }>(child)) return

    if (child.type === Option) {
      options.push({
        value: child.props.value,
        label: child.props.children,
        disabled: child.props.disabled,
        searchText: getSelectLabelText(child.props.children).toLowerCase(),
      })
      return
    }

    if ('children' in child.props) {
      options.push(...collectOptions(child.props.children))
    }
  })

  return options
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  showSearch?: boolean
  children?: ReactNode
}

function SelectRoot({
  value = '',
  onChange,
  allowClear = false,
  placeholder,
  className,
  style,
  children,
  disabled,
  id,
  name,
  defaultValue,
  ...props
}: SelectProps) {
  const options = collectOptions(children)
  const initialValue =
    typeof defaultValue === 'string'
      ? defaultValue
      : Array.isArray(defaultValue)
        ? defaultValue[0]
        : defaultValue == null
          ? undefined
          : String(defaultValue)

  return (
    <CustomSelect
      id={id}
      name={name}
      value={value}
      defaultValue={initialValue}
      allowClear={allowClear}
      placeholder={placeholder}
      showSearch={props.showSearch}
      disabled={disabled}
      style={style}
      className={className}
      options={options}
      onValueChange={nextValue => onChange?.(nextValue)}
    />
  )
}

type SelectComponent = typeof SelectRoot & {
  Option: typeof Option
}

export const Select = SelectRoot as SelectComponent
Select.Option = Option

type ButtonType = 'primary' | 'secondary' | 'outline' | 'text' | 'default'
type ButtonSize = 'mini' | 'small' | 'default' | 'large'

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onChange'> {
  type?: ButtonType
  htmlType?: 'button' | 'submit' | 'reset'
  long?: boolean
  loading?: boolean
  status?: 'danger'
  icon?: ReactNode
  size?: ButtonSize
}

const buttonTypeClasses: Record<ButtonType, string> = {
  primary: 'border border-primary bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-border bg-[var(--control-surface)] text-foreground hover:bg-[var(--control-hover-surface)]',
  outline: 'border border-border bg-[var(--control-surface)] text-foreground hover:bg-[var(--control-hover-surface)]',
  text: 'border border-transparent bg-transparent text-foreground hover:bg-[var(--control-hover-surface)]',
  default: 'border border-border bg-[var(--control-surface)] text-foreground hover:bg-[var(--control-hover-surface)]',
}

const buttonSizeClasses: Record<ButtonSize, string> = {
  mini: 'h-7 px-2 text-xs',
  small: 'h-8 px-3 text-xs',
  default: 'h-9 px-3.5 text-sm',
  large: 'h-10 px-4 text-sm',
}

export function Button({
  type = 'default',
  htmlType = 'button',
  long = false,
  loading = false,
  status,
  icon,
  size = 'default',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={htmlType}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-sm transition-colors',
        buttonTypeClasses[type],
        buttonSizeClasses[size],
        long && 'w-full',
        status === 'danger' && 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40',
        (disabled || loading) && 'cursor-not-allowed opacity-60',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

interface CardProps {
  id?: string
  title?: ReactNode
  extra?: ReactNode
  style?: CSSProperties
  layout?: 'default' | 'editor-section'
  children: ReactNode
}

export function Card({ id, title, extra, style, layout = 'default', children }: CardProps) {
  if (layout === 'editor-section') {
    return (
      <section
        id={id}
        className="mb-12 scroll-mt-24"
        style={style}
      >
        <div className="flex flex-col gap-4 md:flex-row md:gap-8">
          {title || extra ? (
            <div className="md:w-[180px] md:flex-none md:self-stretch">
              <div
                className="md:sticky md:z-10 md:h-fit"
                style={{ top: 'var(--editor-section-sticky-top, 16px)' }}
              >
                <div className="flex items-center justify-between gap-3 bg-background/92 py-1 backdrop-blur md:min-h-9">
                  {title ? <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">{title}</h3> : null}
                  {extra ? <div className="shrink-0">{extra}</div> : null}
                </div>
              </div>
            </div>
          ) : null}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </section>
    )
  }

  return (
    <section id={id} className="rounded-sm border border-border bg-background p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={style}>
      {title || extra ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-medium text-foreground">{title}</h3>
          <div>{extra}</div>
        </div>
      ) : null}
      {children}
    </section>
  )
}

interface SpinProps {
  size?: number
}

export function Spin({ size = 24 }: SpinProps) {
  return <Loader2 className="animate-spin text-muted-foreground" style={{ width: size, height: size }} />
}

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: string
  onChange?: (value: string) => void
  format?: string
}

export function DatePicker({ value = '', onChange, className, ...props }: DatePickerProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={event => onChange?.(event.target.value)}
      className={cx(
        'control-field h-9 w-full px-3 py-2 pr-10 text-sm leading-5 text-foreground outline-none tabular-nums',
        className,
      )}
      {...props}
    />
  )
}

interface ModalProps {
  title?: ReactNode
  visible: boolean
  onCancel?: () => void
  onOk?: () => void
  confirmLoading?: boolean
  okText?: string
  cancelText?: string
  style?: CSSProperties
  unmountOnExit?: boolean
  children: ReactNode
}

export function Modal({
  title,
  visible,
  onCancel,
  onOk,
  confirmLoading = false,
  okText = '确定',
  cancelText = '取消',
  style,
  unmountOnExit = false,
  children,
}: ModalProps) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  const shouldRender = visible || !unmountOnExit

  if (!shouldRender) return null

  return createPortal(
    <div
      className={cx(
        'fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 p-4',
        !visible && 'pointer-events-none opacity-0',
      )}
    >
      <div
        className="max-h-[90vh] w-full max-w-[640px] overflow-hidden rounded-md border border-border bg-background shadow-xl"
        style={style}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <button
            type="button"
            className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onCancel}
            aria-label="关闭弹窗"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-auto p-4">{children}</div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="text" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button type="secondary" loading={confirmLoading} onClick={onOk}>
            {okText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export const Message = {
  success: (content: string) => toast.success(content),
  error: (content: string) => toast.error(content),
  warning: (content: string) => toast.warning(content),
  info: (content: string) => toast.info(content),
}
