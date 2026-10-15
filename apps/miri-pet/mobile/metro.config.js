// pnpm 모노레포는 Expo SDK 기본 설정(getDefaultConfig)이 자동 처리한다 (architecture D1)
const { getDefaultConfig } = require('expo/metro-config')

module.exports = getDefaultConfig(__dirname)
