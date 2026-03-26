import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 允许浏览器扩展访问 API
  const response = NextResponse.next()
  
  // 获取请求来源
  const origin = request.headers.get('origin')
  
  // 允许 localhost 和浏览器扩展
  if (
    origin &&
    (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('chrome-extension://') ||
      origin.startsWith('moz-extension://')
    )
  ) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
  
  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    })
  }
  
  return response
}

export const config = {
  matcher: '/api/:path*',
}
