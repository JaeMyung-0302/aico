import { MemoryObjectStorage } from './memory-object-storage'

const put = (storage: MemoryObjectStorage, key: string, body = 'x') =>
  storage.putObject({ key, body: Buffer.from(body), contentType: 'text/plain' })

describe('MemoryObjectStorage', () => {
  it('head는 크기를, 없으면 null', async () => {
    const storage = new MemoryObjectStorage()
    await put(storage, 'c/a/1', 'abc')
    await expect(storage.head('c/a/1')).resolves.toEqual({ size: 3 })
    await expect(storage.head('c/a/2')).resolves.toBeNull()
  })

  it('listKeys는 접두사로 시작하는 키만 정렬해 돌려준다', async () => {
    const storage = new MemoryObjectStorage()
    await Promise.all(['c/a/2', 'c/a/1', 'c/b/1', 'incoming/a/1'].map((key) => put(storage, key)))
    await expect(storage.listKeys('c/a/')).resolves.toEqual(['c/a/1', 'c/a/2'])
  })

  it('deletePrefix는 그 접두사만 지우고 지운 개수를 돌려준다', async () => {
    const storage = new MemoryObjectStorage()
    await Promise.all(['c/a/1', 'c/a/2', 'c/ab/1'].map((key) => put(storage, key)))
    await expect(storage.deletePrefix('c/a/')).resolves.toBe(2)
    await expect(storage.listKeys('c/')).resolves.toEqual(['c/ab/1'])
  })

  it('deletePrefix는 빈 접두사·슬래시로 끝나지 않는 접두사를 거부한다', async () => {
    const storage = new MemoryObjectStorage()
    await expect(storage.deletePrefix('')).rejects.toThrow()
    await expect(storage.deletePrefix('c/a')).rejects.toThrow()
  })

  it('deleteObjects·clear', async () => {
    const storage = new MemoryObjectStorage()
    await Promise.all(['k/1', 'k/2'].map((key) => put(storage, key)))
    await storage.deleteObjects(['k/1', 'missing'])
    await expect(storage.listKeys('k/')).resolves.toEqual(['k/2'])
    storage.clear()
    await expect(storage.listKeys('')).resolves.toEqual([])
  })
})
