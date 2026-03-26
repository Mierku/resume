import { NextResponse } from 'next/server'
import { getAllTemplates } from '@/server/templates'

export async function GET() {
  const templates = getAllTemplates()
  return NextResponse.json({ templates })
}
