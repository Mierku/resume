import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
    }),
  ],
  theme: {
    colors: {
      primary: 'var(--color-primary)',
      'primary-hover': 'var(--color-primary-hover)',
      background: 'var(--color-background)',
      foreground: 'var(--color-foreground)',
      border: 'var(--color-border)',
      'border-weak': 'var(--color-border-weak)',
      muted: 'var(--color-muted)',
      'muted-foreground': 'var(--color-muted-foreground)',
    },
    borderRadius: {
      DEFAULT: '2px',
      sm: '2px',
      md: '4px',
      lg: '4px',
      full: '999px',
    },
    maxWidth: {
      container: '1120px',
    },
  },
  shortcuts: {
    // Layout
    'container': 'max-w-container mx-auto px-4 sm:px-6',
    
    // Cards
    'card': 'bg-background border border-border rounded-sm p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    'card-hover': 'card hover:border-primary/30 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)] transition-all duration-200',
    
    // Buttons
    'btn': 'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-primary': 'btn bg-primary text-white hover:bg-primary-hover rounded-sm px-4 py-2 text-sm',
    'btn-ghost': 'btn bg-transparent text-foreground hover:bg-muted rounded-sm px-4 py-2 text-sm',
    'btn-outline': 'btn bg-transparent text-foreground border border-border hover:border-primary hover:text-primary rounded-sm px-4 py-2 text-sm',
    'btn-icon': 'btn p-2 rounded-sm hover:bg-muted',
    
    // Inputs
    'input': 'w-full bg-background border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground',
    'textarea': 'input min-h-[80px] resize-y',
    'select': 'input appearance-none cursor-pointer',
    
    // Pills / Tags
    'pill': 'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-muted text-muted-foreground',
    'pill-primary': 'pill bg-primary/10 text-primary',
    
    // Tabs
    'tabs': 'flex border-b border-border',
    'tab': 'px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px transition-colors',
    'tab-active': 'tab text-primary border-primary',
    
    // Modal
    'modal-overlay': 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center',
    'modal': 'bg-background rounded-sm border border-border shadow-lg max-w-md w-full mx-4 p-6',
    'modal-title': 'text-lg font-semibold text-foreground mb-2',
    'modal-content': 'text-sm text-muted-foreground mb-6',
    
    // Popover
    'popover': 'bg-background border border-border rounded-sm shadow-lg p-2 z-50',
    
    // Toast (handled by sonner but consistent styling)
    'toast': 'bg-background border border-border rounded-sm shadow-lg p-4',
    
    // Header
    'header': 'sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border-weak',
    'nav-link': 'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2',
    'nav-link-active': 'nav-link text-foreground',
    
    // Sidebar
    'sidebar': 'w-56 border-r border-border bg-background h-full',
    'sidebar-link': 'flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors',
    'sidebar-link-active': 'sidebar-link text-primary bg-primary/5',
    
    // Form
    'form-label': 'block text-sm font-medium text-foreground mb-1',
    'form-error': 'text-xs text-red-500 mt-1',
    'form-group': 'space-y-1',
    
    // Accordion
    'accordion': 'border border-border rounded-sm divide-y divide-border',
    'accordion-item': 'p-4',
    'accordion-trigger': 'flex items-center justify-between w-full text-left text-sm font-medium text-foreground',
    'accordion-content': 'text-sm text-muted-foreground mt-2',
    
    // Table
    'table': 'w-full text-sm',
    'table-header': 'text-left text-muted-foreground font-medium border-b border-border',
    'table-cell': 'py-3 px-4',
    'table-row': 'border-b border-border-weak hover:bg-muted/50',
    
    // Skeleton
    'skeleton': 'bg-muted animate-pulse rounded-sm',
    
    // A4 Preview
    'a4-container': 'bg-white shadow-lg mx-auto',
    'a4-ratio': 'aspect-[210/297]',
  },
  safelist: [
    'i-lucide-home',
    'i-lucide-file-text',
    'i-lucide-briefcase',
    'i-lucide-credit-card',
    'i-lucide-help-circle',
    'i-lucide-user',
    'i-lucide-log-out',
    'i-lucide-plus',
    'i-lucide-minus',
    'i-lucide-move',
    'i-lucide-arrow-up',
    'i-lucide-arrow-down',
    'i-lucide-maximize-2',
    'i-lucide-x',
    'i-lucide-check',
    'i-lucide-save',
    'i-lucide-refresh-cw',
    'i-lucide-undo-2',
    'i-lucide-redo-2',
    'i-lucide-bold',
    'i-lucide-italic',
    'i-lucide-underline',
    'i-lucide-list-ordered',
    'i-lucide-list',
    'i-lucide-strikethrough',
    'i-lucide-link',
    'i-lucide-chevron-down',
    'i-lucide-chevron-right',
    'i-lucide-arrow-left',
    'i-lucide-settings',
    'i-lucide-download',
    'i-lucide-upload',
    'i-lucide-trash-2',
    'i-lucide-edit',
    'i-lucide-copy',
    'i-lucide-external-link',
    'i-lucide-search',
    'i-lucide-loader-2',
    'i-lucide-mail',
    'i-lucide-chrome',
    'i-lucide-grip-vertical',
    'i-lucide-image',
    'i-lucide-type',
    'i-lucide-align-left',
    'i-lucide-zoom-in',
    'i-lucide-zoom-out',
    'i-lucide-minimize-2',
    'i-lucide-folder',
    'i-lucide-database',
    'i-lucide-layout-template',
  ],
})
