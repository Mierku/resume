const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'hr',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'mark',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'colgroup',
  'col',
  'a',
  'blockquote',
])

const ALLOWED_ATTR = new Set(['class', 'style', 'href', 'target', 'rel', 'colspan', 'rowspan', 'data-type', 'data-label'])

const VOID_TAGS = new Set(['br', 'hr', 'col'])

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''

  const lower = trimmed.toLowerCase()
  if (lower.startsWith('javascript:')) return ''
  if (lower.startsWith('data:')) return ''

  return trimmed
}

function sanitizeInlineStyle(styleText: string): string {
  return styleText
    .replace(/javascript\s*:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(\s*["']?\s*(?:javascript|data):/gi, 'url(')
    .replace(/behavior\s*:/gi, '')
    .replace(/-moz-binding\s*:/gi, '')
    .trim()
}

function sanitizeHtmlFallback(html: string): string {
  return html
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*(?:javascript|data):.*?\2/gi, '')
    .replace(/javascript\s*:/gi, '')
}

function sanitizeWithDomParser(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return sanitizeHtmlFallback(html)
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html')
  const body = doc.body

  const renderNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || '')
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ''
    }

    const element = node as HTMLElement
    const tag = element.tagName.toLowerCase()
    const children = Array.from(element.childNodes).map(renderNode).join('')

    if (!ALLOWED_TAGS.has(tag)) {
      return children
    }

    const attrs: string[] = []
    let hasRelAttr = false
    let hasTargetBlank = false

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on')) continue
      if (!ALLOWED_ATTR.has(name)) continue

      let value = attribute.value || ''
      if (name === 'href') {
        value = sanitizeUrl(value)
        if (!value) continue
      }

      if (name === 'style') {
        value = sanitizeInlineStyle(value)
        if (!value) continue
      }

      if (name === 'target') {
        if (value !== '_blank') {
          value = '_self'
        } else {
          hasTargetBlank = true
        }
      }

      if (name === 'rel') {
        hasRelAttr = true
        value = value || 'noopener noreferrer nofollow'
      }

      attrs.push(`${name}="${escapeHtml(value)}"`)
    }

    if (tag === 'a' && hasTargetBlank && !hasRelAttr) {
      attrs.push('rel="noopener noreferrer nofollow"')
    }

    const attrsText = attrs.length > 0 ? ` ${attrs.join(' ')}` : ''

    if (VOID_TAGS.has(tag)) {
      return `<${tag}${attrsText}>`
    }

    return `<${tag}${attrsText}>${children}</${tag}>`
  }

  return Array.from(body.childNodes).map(renderNode).join('')
}

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return sanitizeWithDomParser(html)
}

export function sanitizeCss(css: string): string {
  if (!css) return ''

  return css
    .replace(/javascript\s*:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(\s*["']?\s*(?:javascript|data):/gi, 'url(')
    .replace(/behavior\s*:/gi, '')
    .replace(/-moz-binding\s*:/gi, '')
    .replace(/@import\s+(?:url\s*\()?\s*["']?\s*(?:javascript|data):/gi, '')
}
