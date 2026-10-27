// 항목을 하나씩 순서대로 처리한다(DB·스토리지 부하를 한 번에 몰지 않는다)
export const sequentially = <T, R>(items: readonly T[], run: (item: T) => Promise<R>): Promise<R[]> =>
  items.reduce<Promise<R[]>>(async (previous, item) => [...(await previous), await run(item)], Promise.resolve([]))
