export const SYSTEM_PAGE_GAP_X_PT = 4
export const SYSTEM_PAGE_GAP_Y_PT = 6

export const SMART_ONE_PAGE_BODY_FONT_SIZE_LIMIT = {
  min: 11,
  max: 16,
  step: 0.1,
  defaultValue: 12,
  presets: [11, 12, 13, 14, 15, 16] as const,
}

export const SMART_ONE_PAGE_BODY_LINE_HEIGHT_LIMIT = {
  min: 1.3,
  max: 1.5,
  step: 0.01,
  defaultValue: 1.4,
  presets: [1.3, 1.35, 1.4, 1.45, 1.5] as const,
}

export const SMART_ONE_PAGE_GAP_X_LIMIT = {
  min: 3,
  max: 6,
  step: 0.1,
  defaultValue: SYSTEM_PAGE_GAP_X_PT,
  presets: [3, 3.5, 4, 4.5, 5, 6] as const,
}

export const SMART_ONE_PAGE_GAP_Y_LIMIT = {
  min: 4.5,
  max: 7.5,
  step: 0.1,
  defaultValue: SYSTEM_PAGE_GAP_Y_PT,
  presets: [4.5, 5, 5.5, 6, 6.5, 7, 7.5] as const,
}
