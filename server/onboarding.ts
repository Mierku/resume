import { prisma } from '@/lib/prisma'

interface OnboardingStatus {
  completed: boolean
  steps: {
    installExtension: boolean
    tryFill: boolean
  }
}

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return {
    completed: user.onboardingCompleted,
    steps: {
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

async function resetOnboarding(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: false },
  })
}
