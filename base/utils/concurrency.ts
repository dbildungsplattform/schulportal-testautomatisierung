export function createMany<T>(count: number, factory: () => Promise<T>): Promise<T[]> {
  return Promise.all(Array.from({ length: count }, factory));
}
