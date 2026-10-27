// 단위 테스트용 Prisma 대역: delegate 메서드를 jest.fn()으로 채운다.
// Test.createTestingModule의 useValue로 주입하므로 타입 단언 없이 쓸 수 있다
type DelegateName = 'user' | 'authAccount' | 'session' | 'consent' | 'pushToken' | 'coupleMember'

type MethodName =
  | 'findUnique'
  | 'findFirst'
  | 'findMany'
  | 'create'
  | 'createMany'
  | 'update'
  | 'updateMany'
  | 'upsert'
  | 'delete'
  | 'deleteMany'
  | 'count'

type FakeDelegate = Record<MethodName, jest.Mock>

export type FakePrisma = Record<DelegateName, FakeDelegate> & { $transaction: jest.Mock }

const createDelegate = (): FakeDelegate => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
})

export const createFakePrisma = (): FakePrisma => {
  const fake: FakePrisma = {
    user: createDelegate(),
    authAccount: createDelegate(),
    session: createDelegate(),
    consent: createDelegate(),
    pushToken: createDelegate(),
    coupleMember: createDelegate(),
    // 인터랙티브 트랜잭션은 같은 대역을 tx로 넘기고, 배열 트랜잭션은 각 Promise를 모은다
    $transaction: jest.fn((arg: unknown) => {
      if (typeof arg === 'function') return arg(fake)
      return Array.isArray(arg) ? Promise.all(arg) : Promise.reject(new Error('지원하지 않는 트랜잭션 인자'))
    }),
  }
  return fake
}
