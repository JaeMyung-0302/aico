const ts = () => new Date().toISOString()

export const logger = {
  info: (msg: string) => console.info(`${ts()} [INFO] ${msg}`),
  warn: (msg: string) => console.warn(`${ts()} [WARN] ${msg}`),
  error: (msg: string, err?: unknown) => console.error(`${ts()} [ERROR] ${msg}`, err ?? ''),
}
