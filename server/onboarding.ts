import { prisma } from '@/lib/prisma'

export interface OnboardingStatus {
  completed: boolean
  hasDataSource: boolean
  steps: {
    createDataSource: boolean
    installExtension: boolean
    tryFill: boolean
  }
}

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      dataSources: {
        take: 1,
      },
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const hasDataSource = user.dataSources.length > 0

  return {
    completed: user.onboardingCompleted,
    hasDataSource,
    steps: {
      createDataSource: hasDataSource,
      installExtension: user.onboardingCompleted, // Simplified: assume if completed, extension was installed
      tryFill: user.onboardingCompleted,
    },
  }
}

export async function completeOnboarding(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true },
  })
}

export async function resetOnboarding(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: false },
  })
}
