import { auth } from '@/auth'
import { prisma } from './prisma'

export async function getCurrentUser() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return null
  }

  return prisma.user.findUnique({
    where: { id: userId },
  })
}
