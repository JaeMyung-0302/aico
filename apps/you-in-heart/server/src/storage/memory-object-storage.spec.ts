import { Readable } from 'node:stream'
import { MemoryObjectStorage } from './memory-object-storage'
import { ObjectTooLargeError } from './object-storage'

const put = (storage: MemoryObjectStorage, key: string, body = 'x') =>
  storage.putObject({ key, body: Buffer.from(body), contentType: 'text/plain' })

describe('MemoryObjectStorage', () => {
  it('head는 크기를, 없으면 null', async () => {
    const storage = new MemoryObjectStorage()
    await put(storage, 'c/a/1', 'abc')
    await expect(storage.head('c/a/1')).resolves.toEqual({ size: 3 })
    await expect(storage.head('c/a/2')).resolves.toBeNull()
  })

  it('getObject는 본문을, 없으면 null', async () => {
    const storage = new MemoryObjectStorage()
    await put(storage, 'system/x', '{"a":1}')
    await expect(storage.getObject('system/x')).resolves.toEqual(Buffer.from('{"a":1}'))
    await expect(storage.getObject('system/y')).resolves.toBeNull()
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

  it('presign URL은 키와 X-Amz-Expires를 담고, getObjectRange는 앞 N바이트', async () => {
    const storage = new MemoryObjectStorage()
    await put(storage, 'c/a/o', 'abcdef')
    const putUrl = new URL(await storage.presignPut({ key: 'c/a/o', contentType: 'image/jpeg', expiresIn: 300 }))
    expect([putUrl.pathname, putUrl.searchParams.get('X-Amz-Expires')]).toEqual(['/c/a/o', '300'])
    const getUrl = new URL(await storage.presignGet('c/a/o', 3600))
    expect(getUrl.searchParams.get('X-Amz-Expires')).toBe('3600')
    await expect(storage.getObjectRange('c/a/o', 3)).resolves.toEqual(Buffer.from('abc'))
    await expect(storage.getObjectRange('c/a/x', 3)).resolves.toBeNull()
  })

  it('getObjectBounded는 maxBytes 이하면 본문, 넘으면 ObjectTooLargeError, 없으면 null', async () => {
    const storage = new MemoryObjectStorage()
    await put(storage, 'incoming/a/1', 'abcdef')
    await expect(storage.getObjectBounded('incoming/a/1', 6)).resolves.toEqual(Buffer.from('abcdef'))
    await expect(storage.getObjectBounded('incoming/a/1', 5)).rejects.toBeInstanceOf(ObjectTooLargeError)
    await expect(storage.getObjectBounded('incoming/a/x', 5)).resolves.toBeNull()
  })

  it('getObjectStream은 본문 스트림(없으면 null), uploadStream은 스트림을 모아 저장한다', async () => {
    const storage = new MemoryObjectStorage()
    await storage.uploadStream({
      key: 'exports/a/j.zip',
      body: Readable.from([Buffer.from('ab'), Buffer.from('cd')]),
      contentType: 'application/zip',
    })
    await expect(storage.getObject('exports/a/j.zip')).resolves.toEqual(Buffer.from('abcd'))
    const stream = await storage.getObjectStream('exports/a/j.zip')
    expect(Buffer.concat((await stream?.toArray()) ?? [])).toEqual(Buffer.from('abcd'))
    await expect(storage.getObjectStream('exports/a/x')).resolves.toBeNull()
  })
})
