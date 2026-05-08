import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient() {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
  })

  // ioredis emits connection failures as events in addition to rejecting commands.
  // Keep unused imports during build from spamming stderr; callers still see command failures.
  client.on('error', () => {})

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// Rate limiting helpers
const RATE_LIMIT_PREFIX = 'rate_limit:'

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`
  const current = await redis.incr(fullKey)
  
  if (current === 1) {
    await redis.expire(fullKey, windowSeconds)
  }
  
  const allowed = current <= maxRequests
  const remaining = Math.max(0, maxRequests - current)
  
  return { allowed, remaining }
}
