// Expo 권장 설정 (레퍼런스 naracellar와 동일한 기반)
const expoConfig = require('eslint-config-expo/flat')

module.exports = [...expoConfig, { ignores: ['dist/*', '.expo/*'] }]
