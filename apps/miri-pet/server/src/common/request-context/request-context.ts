import { AsyncLocalStorage } from 'node:async_hooks'

// 요청 하나 동안만 사는 메모 저장소 (request-scoped provider 없이 요청 단위 메모이즈)
export type RequestContext = {
  hiddenUserIds: Map<string, Promise<ReadonlySet<string>>>
}

const storage = new AsyncLocalStorage<RequestContext>()

const createContext = (): RequestContext => ({ hiddenUserIds: new Map() })

export const getRequestContext = (): RequestContext | undefined => storage.getStore()

export const runWithRequestContext = <T>(fn: () => T): T => storage.run(createContext(), fn)

export const requestContextMiddleware = (_req: unknown, _res: unknown, next: () => void): void => {
  runWithRequestContext(next)
}
