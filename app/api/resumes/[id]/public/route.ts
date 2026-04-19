import { NextResponse } from 'next/server'
import { getPublicResumeView } from '@/server/resumes'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await getPublicResumeView(id)

    if (result.status === 'hidden') {
      return NextResponse.json({
        status: 'hidden',
        resumeId: result.resumeId,
        title: result.title,
        message: '此简历无法查看',
        detail: '作者已经隐藏了简历',
      })
    }

    return NextResponse.json({
      status: 'visible',
      canDownload: result.canDownload,
      resume: result.resume,
    })
  } catch (error) {
    console.error('Get public resume error:', error)
    return NextResponse.json(
      {
        status: 'hidden',
        message: '此简历无法查看',
        detail: '作者已经隐藏了简历',
      },
      { status: 200 }
    )
  }
}
