import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { listEligibleCouponsForCheckout } from '@/server/commerce/coupons'
import { getVipPackageById } from '@/server/commerce/packages'

const querySchema = z.object({
  vipPackageId: z.string().trim().min(1, '请选择套餐'),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const query = querySchema.parse({
      vipPackageId: request.nextUrl.searchParams.get('vipPackageId'),
    })
    const vipPackage = await getVipPackageById(query.vipPackageId)

    if (!vipPackage || vipPackage.status !== 'active') {
      return NextResponse.json({ error: '套餐不可购买' }, { status: 404 })
    }

    const coupons = await listEligibleCouponsForCheckout({
      vipPackageId: vipPackage.id,
      userId: user.id,
      originalAmountFen: vipPackage.priceFen,
    })

    return NextResponse.json({ coupons })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || '参数错误' }, { status: 400 })
    }

    console.error('Failed to load eligible coupons:', error)
    return NextResponse.json({ error: '优惠券加载失败' }, { status: 500 })
  }
}
