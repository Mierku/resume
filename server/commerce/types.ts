import type {
  CommerceOrder,
  CommerceOrderStatus,
  Coupon,
  CouponAudience,
  CouponStackingRule,
  CouponType,
  MembershipPlan,
  VipPackage,
  VipPackageStatus,
} from '@prisma/client'

export interface CheckoutPricingResult {
  vipPackage: VipPackage
  coupon: Coupon | null
  originalAmountFen: number
  discountAmountFen: number
  payableAmountFen: number
}

export interface CheckoutOrderSnapshot {
  packageCodeSnapshot: string
  packageNameSnapshot: string
  packageSubtitleSnapshot: string | null
  membershipPlanSnapshot: MembershipPlan
  durationDaysSnapshot: number
  originalAmountFen: number
  discountAmountFen: number
  payableAmountFen: number
  couponCodeSnapshot?: string | null
}

export interface CouponValidationResult {
  coupon: Coupon
  discountAmountFen: number
}

export interface AdminOrderActionInput {
  action: 'close_unpaid' | 'mark_manual_review'
  reason?: string
}

export const ACTIVE_PACKAGE_STATUSES: VipPackageStatus[] = ['active']
export const ACTIVE_COUPON_STATUSES = ['active'] as const
export const ORDER_INSPECT_ONLY_STATUSES: CommerceOrderStatus[] = ['paid', 'fulfilled']

export const SUPPORTED_COUPON_TYPES: CouponType[] = [
  'fixed_amount',
  'percentage',
  'threshold_discount',
]

export const SUPPORTED_COUPON_AUDIENCES: CouponAudience[] = [
  'all',
  'new_user',
  'existing_user',
  'active_vip',
  'inactive_vip',
]

export const SUPPORTED_STACKING_RULES: CouponStackingRule[] = [
  'single_only',
  'future_stackable',
]

export type CommerceOrderRecord = CommerceOrder
