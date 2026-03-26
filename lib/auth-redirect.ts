export function sanitizeNextPath(nextPath: string | null | undefined): string {
  if (!nextPath) {
    return '/dashboard'
  }

  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/dashboard'
  }

  return nextPath
}
