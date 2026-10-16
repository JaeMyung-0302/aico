import { join, resolve } from 'node:path'
import type { NextFunction, Request, Response } from 'express'

// src/bootstrap, dist/bootstrap 어디서 실행해도 apps/miri-pet/server/public/legal을 가리킨다
export const LEGAL_DIR = resolve(__dirname, '../../public/legal')
export const LEGAL_DOCS = ['terms', 'privacy', 'location'] as const
export type LegalDoc = (typeof LEGAL_DOCS)[number]

const LEGAL_PATH = /^\/legal\/(terms|privacy|location)(?:\.html)?$/

const isLegalDoc = (value: string): value is LegalDoc => LEGAL_DOCS.some((doc) => doc === value)

export const matchLegalDoc = (path: string): LegalDoc | null => {
  const name = LEGAL_PATH.exec(path)?.[1]
  return name && isLegalDoc(name) ? name : null
}

// GET /legal/{terms,privacy,location} — 앱 동의 화면·스토어 등록용 공개 URL (API prefix 밖)
export const legalPagesMiddleware = (
  req: Pick<Request, 'method' | 'path'>,
  res: Pick<Response, 'type' | 'sendFile'>,
  next: NextFunction,
): void => {
  const doc = req.method === 'GET' ? matchLegalDoc(req.path) : null
  if (!doc) return next()
  res.type('html').sendFile(join(LEGAL_DIR, `${doc}.html`))
}
