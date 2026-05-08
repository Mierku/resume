import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { createPendingCommerceOrder, markCheckoutManualReview, persistWechatPaymentAttempt } from '@/server/commerce/orders'
import { getVipPackageById } from '@/server/commerce/packages'
import { validateCouponForCheckout } from '@/server/commerce/coupons'
import { isCommerceError } from '@/server/commerce/errors'
import { createNativeWechatOrder } from '@/server/payments/wechat-native'

const checkoutSchema = z.object({
  vipPackageId: z.string().min(1, '请选择套餐'),
  couponCode: z.string().trim().min(1).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = checkoutSchema.parse(await request.json())
    const vipPackage = await getVipPackageById(body.vipPackageId)

    if (!vipPackage || vipPackage.status !== 'active') {
      return NextResponse.json({ error: '套餐不可购买' }, { status: 404 })
    }

    let couponApplication:
      | {
          couponId: string
          couponCodeSnapshot: string
          couponNameSnapshot: string
          couponTypeSnapshot: 'fixed_amount' | 'percentage' | 'threshold_discount'
          stackingRuleSnapshot: 'single_only' | 'future_stackable'
          audienceSnapshot: 'all' | 'new_user' | 'existing_user' | 'active_vip' | 'inactive_vip'
          discountAmountFen: number
        }
      | undefined

    if (body.couponCode) {
      const validated = await validateCouponForCheckout({
        code: body.couponCode,
        vipPackageId: vipPackage.id,
        userId: user.id,
        originalAmountFen: vipPackage.priceFen,
      })
      couponApplication = {
        couponId: validated.coupon.id,
        couponCodeSnapshot: validated.coupon.code,
        couponNameSnapshot: validated.coupon.name,
        couponTypeSnapshot: validated.coupon.type,
        stackingRuleSnapshot: validated.coupon.stackingRule,
        audienceSnapshot: validated.coupon.audience,
        discountAmountFen: validated.discountAmountFen,
      }
    }

    const order = await prisma.$transaction(tx =>
      createPendingCommerceOrder(tx, {
        userId: user.id,
        vipPackageId: vipPackage.id,
        membershipPlanSnapshot: vipPackage.membershipPlan,
        durationDaysSnapshot: vipPackage.durationDays,
        packageCodeSnapshot: vipPackage.code,
        packageNameSnapshot: vipPackage.name,
        packageSubtitleSnapshot: vipPackage.subtitle,
        originalAmountFen: vipPackage.priceFen,
        discountAmountFen: couponApplication?.discountAmountFen || 0,
        payableAmountFen: Math.max(1, vipPackage.priceFen - (couponApplication?.discountAmountFen || 0)),
        couponApplication,
      }),
    )

    try {
      const nativeOrder = await createNativeWechatOrder({
        description: vipPackage.name,
        outTradeNo: order.orderNumber,
        amountFen: order.payableAmountFen,
      })

      const paymentAttempt = await persistWechatPaymentAttempt({
        orderId: order.id,
        merchantTradeNumber: order.orderNumber,
        requestPayload: nativeOrder.requestPayload,
        responsePayload: nativeOrder.responsePayload,
        responseCodeUrl: nativeOrder.codeUrl,
      })

      return NextResponse.json({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: 'awaiting_payment',
          payableAmountFen: order.payableAmountFen,
        },
        payment: {
          id: paymentAttempt.id,
          codeUrl: nativeOrder.codeUrl,
        },
      })
    } catch (error) {
      console.error('Failed to create wechat pay order:', error)
      await markCheckoutManualReview({
        orderId: order.id,
        reason: error instanceof Error ? error.message : '统一下单成功后本地持久化失败或统一下单失败',
      })

      return NextResponse.json(
        {
          error: '下单已进入人工复核，请稍后在后台确认订单状态',
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: 'manual_review',
          },
        },
        { status: 502 },
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || '参数错误' }, { status: 400 })
    }
    if (isCommerceError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Checkout failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : '下单失败' }, { status: 500 })
  }
}
