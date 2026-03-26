import { NextRequest } from 'next/server'

export function isInternalRequestAuthorized(request: NextRequest) {
  const configuredToken = process.env.INTERNAL_SYNC_TOKEN

  if (!configuredToken) {
    return process.env.NODE_ENV !== 'production'
  }

  const headerToken = request.headers.get('x-sync-token')
  if (headerToken && headerToken === configuredToken) {
    return true
  }

  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return false
  }

  if (authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length) === configuredToken
  }

  return false
}
