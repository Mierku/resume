export const DASHBOARD_SECTION_IDS = [
  'workbench',
  'tracking',
  'resume',
  'admin-users',
  'admin-commerce',
  'account',
] as const

export type DashboardSection = (typeof DASHBOARD_SECTION_IDS)[number]

function isDashboardSection(value: string | null | undefined): value is DashboardSection {
  return DASHBOARD_SECTION_IDS.includes(value as DashboardSection)
}

export function parseDashboardSection(value: string | null | undefined): DashboardSection {
  return isDashboardSection(value) ? value : 'workbench'
}

export function getDashboardSectionHref(section: DashboardSection) {
  return `/dashboard?section=${section}`
}
