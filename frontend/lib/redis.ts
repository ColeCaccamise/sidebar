import { Redis } from '@upstash/redis';

export async function getRedis({ key }: { key: string }) {
  const redis = new Redis({
    url: process.env.REDIS_ENDPOINT,
    token: process.env.REDIS_PASSWORD,
  });

  try {
    const data = await redis.get(key);
    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: 'failed to get redis value',
    };
  }
}

export async function setRedis({ key, value }: { key: string; value: string }) {
  const redis = new Redis({
    url: process.env.REDIS_ENDPOINT,
    token: process.env.REDIS_PASSWORD,
  });
  try {
    await redis.set(key, value);

    return {
      success: true,
      data: value,
    };
  } catch (error) {
    return {
      success: false,
      error: 'failed to set redis value',
      details: error instanceof Error ? error.message : 'unknown error',
    };
  }
}
