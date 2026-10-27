import { type INestApplication, RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { DiscoveryService, MetadataScanner } from '@nestjs/core'
import { ALLOW_WITHOUT_COUPLE_KEY } from '../../src/couples/decorators/allow-without-couple.decorator'

// route: 'PATCH /couples/me' 형식(전역 prefix /api/v1 제외). isWithoutCouple: @AllowWithoutCouple() 여부(클래스·메서드)
export type RouteInfo = { route: string; isWithoutCouple: boolean }

const toPaths = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return typeof value === 'string' ? [value] : ['/']
}

const joinPath = (...parts: readonly string[]): string =>
  `/${parts
    .flatMap((part) => part.split('/'))
    .filter((segment) => segment.length > 0)
    .join('/')}`

const routesOfHandler = (
  controllerPaths: readonly string[],
  handler: unknown,
  isClassWithout: boolean,
): RouteInfo[] => {
  if (typeof handler !== 'function') return []
  const methodPath: unknown = Reflect.getMetadata(PATH_METADATA, handler)
  const method: unknown = Reflect.getMetadata(METHOD_METADATA, handler)
  if (methodPath === undefined || typeof method !== 'number') return []
  const isWithoutCouple = isClassWithout || Reflect.getMetadata(ALLOW_WITHOUT_COUPLE_KEY, handler) === true
  return controllerPaths.flatMap((controllerPath) =>
    toPaths(methodPath).map((path) => ({
      route: `${RequestMethod[method]} ${joinPath(controllerPath, path)}`,
      isWithoutCouple,
    })),
  )
}

// Nest DiscoveryService로 등록된 모든 컨트롤러의 라우트를 모은다(앱에 DiscoveryModule이 있어야 한다)
export const collectRoutes = (app: INestApplication): RouteInfo[] => {
  const discovery = app.get(DiscoveryService)
  const scanner = new MetadataScanner()
  return discovery.getControllers().flatMap(({ metatype, instance }) => {
    if (!metatype || typeof instance !== 'object' || instance === null) return []
    const prototype: object = Object.getPrototypeOf(instance)
    const controllerPaths = toPaths(Reflect.getMetadata(PATH_METADATA, metatype))
    const isClassWithout = Reflect.getMetadata(ALLOW_WITHOUT_COUPLE_KEY, metatype) === true
    return scanner
      .getAllMethodNames(prototype)
      .flatMap((name) => routesOfHandler(controllerPaths, Reflect.get(prototype, name), isClassWithout))
  })
}
