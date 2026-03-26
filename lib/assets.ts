const cdnOrigin = (process.env.NEXT_PUBLIC_CDN_ORIGIN || '').replace(/\/$/, '')

export function toAssetUrl(path: string) {
  if (!path.startsWith('/')) return path
  if (!cdnOrigin) return path
  return `${cdnOrigin}${path}`
}
