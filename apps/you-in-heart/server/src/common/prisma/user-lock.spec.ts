import { lockUsers } from './user-lock'

const A = '0199e3a0-0000-7000-8000-0000000000a1'
const B = '0199e3a0-0000-7000-8000-0000000000b2'

describe('lockUsers', () => {
  it('User 행을 id 순서로 FOR UPDATE 잠그는 매개변수화 쿼리 하나를 보낸다(교착 방지)', async () => {
    const queryRaw = jest.fn().mockResolvedValue([
      { id: A, status: 'ACTIVE' },
      { id: B, status: 'DELETED' },
    ])
    const rows = await lockUsers({ $queryRaw: queryRaw }, [B, A])
    expect(queryRaw).toHaveBeenCalledTimes(1)
    const [sql] = queryRaw.mock.calls[0] ?? []
    expect(sql.sql.replace(/\s+/g, ' ').trim()).toBe(
      'SELECT id, status FROM "User" WHERE id IN (?::uuid,?::uuid) ORDER BY id FOR UPDATE',
    )
    // 값은 SQL에 붙지 않고 매개변수로만 간다. 같은 id 두 번은 한 번만
    expect(sql.values).toEqual([A, B])
    expect(rows).toEqual([
      { id: A, status: 'ACTIVE' },
      { id: B, status: 'DELETED' },
    ])
  })

  it('같은 id가 두 번 와도 한 번만 잠근다', async () => {
    const queryRaw = jest.fn().mockResolvedValue([])
    await lockUsers({ $queryRaw: queryRaw }, [A, A])
    expect(queryRaw.mock.calls[0]?.[0].values).toEqual([A])
  })
})
