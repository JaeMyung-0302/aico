import { spawn, type ChildProcess } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import puppeteer from 'puppeteer'

const DIST_DIR = resolve(import.meta.dirname, '../dist')
const INDEX_HTML = resolve(DIST_DIR, 'index.html')
const PORT = 4173

// dist/ 폴더를 로컬 서버로 서빙
const startServer = (): ChildProcess => {
  const server = spawn('npx', ['serve', DIST_DIR, '-l', String(PORT), '-s'], {
    stdio: 'pipe',
  })
  return server
}

// 서버가 응답할 때까지 대기
const waitForServer = async (url: string, maxRetries = 20): Promise<void> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fetch(url)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw new Error(`서버가 ${url}에서 응답하지 않습니다.`)
}

const prerender = async () => {
  console.log('Prerender: 시작...')

  const server = startServer()

  try {
    const url = `http://localhost:${PORT}`
    await waitForServer(url)
    console.log(`Prerender: 서버 준비 완료 (${url})`)

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

    // 홈페이지 주요 요소가 렌더링될 때까지 대기
    await page.waitForSelector('h1', { timeout: 10000 })

    const html = await page.content()
    await browser.close()

    // 기존 index.html을 prerendered HTML로 교체
    writeFileSync(INDEX_HTML, html, 'utf-8')

    const size = readFileSync(INDEX_HTML, 'utf-8').length
    console.log(`Prerender: 완료! (${(size / 1024).toFixed(1)}KB)`)
  } finally {
    server.kill()
  }
}

prerender().catch((err) => {
  console.error('Prerender 실패:', err)
  // prerender 실패해도 빌드는 계속 (원본 SPA index.html 유지)
  process.exit(0)
})
