import { NextRequest, NextResponse } from 'next/server'
import { RecordStatus } from '@prisma/client'
import { getCurrentUser } from '@/lib/session'
import { exportRecordsCSV } from '@/server/records'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as RecordStatus | null
    const query = searchParams.get('query')

    const csv = await exportRecordsCSV(user.id, {
      status: status || undefined,
      query: query || undefined,
    })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tracking_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export records error:', error)
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}
