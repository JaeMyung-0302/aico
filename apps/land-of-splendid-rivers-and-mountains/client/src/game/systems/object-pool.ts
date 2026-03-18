export class ObjectPool<T> {
  private readonly pool: T[] = []
  private readonly create: () => T
  private readonly reset: (item: T) => void
  private readonly maxSize: number

  constructor(
    create: () => T,
    reset: (item: T) => void,
    maxSize = 64,
  ) {
    this.create = create
    this.reset = reset
    this.maxSize = maxSize
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.create()
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(item)
      this.pool.push(item)
    }
  }

  clear(): void {
    this.pool.length = 0
  }

  get size(): number {
    return this.pool.length
  }
}
