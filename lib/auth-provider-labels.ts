const DEV_TEST_AUTH_PROVIDER = 'dev_test'

const AUTH_PROVIDER_LABELS: Record<string, string> = {
  wechat_official: '微信登录',
  email_code: '邮箱登录',
  phone_sms: '手机登录',
  [DEV_TEST_AUTH_PROVIDER]: '测试登录',
}

export function normalizeAuthProviderIds(
  rawProviders: string[] | null | undefined,
  options?: {
    currentEmail?: string | null
    devTestEmail?: string | null
  },
) {
  const normalizedProviders = Array.from(
    new Set(
      (rawProviders || [])
        .map(provider => provider.trim().toLowerCase())
        .filter(Boolean),
    ),
  )

  const currentEmail = options?.currentEmail?.trim().toLowerCase()
  const devTestEmail = options?.devTestEmail?.trim().toLowerCase()

  if (
    normalizedProviders.length === 0 &&
    currentEmail &&
    devTestEmail &&
    currentEmail === devTestEmail
  ) {
    normalizedProviders.push(DEV_TEST_AUTH_PROVIDER)
  }

  return normalizedProviders
}

function getVisibleAuthProviderLabels(rawProviders: string[] | null | undefined) {
  return Array.from(
    new Set(
      (rawProviders || [])
        .map(provider => AUTH_PROVIDER_LABELS[provider.trim().toLowerCase()])
        .filter((label): label is string => Boolean(label)),
    ),
  )
}

export function formatAuthProviderLabels(
  rawProviders: string[] | null | undefined,
  fallback = '未识别',
) {
  const labels = getVisibleAuthProviderLabels(rawProviders)
  return labels.length > 0 ? labels.join(' / ') : fallback
}
