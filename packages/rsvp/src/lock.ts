export async function withAsyncLock<T>(locks: Map<string, Promise<void>>, lockKey: string, operation: () => Promise<T>): Promise<T> {
  const previous = locks.get(lockKey) ?? Promise.resolve();
  let releaseCurrentLock: () => void = () => undefined;
  const current = new Promise<void>((resolve) => { releaseCurrentLock = resolve; });
  const chained = previous.then(() => current);
  locks.set(lockKey, chained);
  await previous;
  try {
    return await operation();
  } finally {
    releaseCurrentLock();
    if (locks.get(lockKey) === chained) locks.delete(lockKey);
  }
}
