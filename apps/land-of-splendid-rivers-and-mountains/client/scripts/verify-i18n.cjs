#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ko = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/ko.json'), 'utf8'))
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/i18n/en.json'), 'utf8'))
const koKeys = new Set(Object.keys(ko))
const enKeys = new Set(Object.keys(en))

const dataDir = path.join(ROOT, 'src/game/data')
const dataKeys = new Set()
const extractKeys = (obj) => {
  if (Array.isArray(obj)) {
    for (const entry of obj) extractKeys(entry)
  } else if (obj && typeof obj === 'object') {
    if (obj.nameKey) dataKeys.add(obj.nameKey)
    if (obj.descKey) dataKeys.add(obj.descKey)
    for (const val of Object.values(obj)) extractKeys(val)
  }
}
for (const file of fs.readdirSync(dataDir).filter(f => f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'))
  extractKeys(data)
}

const missing = { ko: [], en: [] }
for (const key of dataKeys) {
  if (!koKeys.has(key)) missing.ko.push(key)
  if (!enKeys.has(key)) missing.en.push(key)
}

const total = missing.ko.length + missing.en.length
if (total > 0) {
  if (missing.ko.length) console.error('Missing in ko.json:', missing.ko.join(', '))
  if (missing.en.length) console.error('Missing in en.json:', missing.en.join(', '))
  process.exit(1)
}
console.log(`OK: ${dataKeys.size} data keys verified in both locales`)
