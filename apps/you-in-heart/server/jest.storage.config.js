// 실제 S3 API 테스트: SeaweedFS(9440, 버킷 youinheart-private) + 테스트 DB(5440 youinheart_test). 먼저 pnpm storage:init
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/storage/.*\\.storage-spec\\.ts$',
  // jose v6는 ESM 전용 → node_modules 중 jose만 ts-jest로 CJS 변환한다
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs', target: 'ES2022' } }],
  },
  transformIgnorePatterns: ['/node_modules/(?!\\.pnpm/jose@|jose/)'],
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  setupFiles: ['<rootDir>/test/integration/setup.ts'],
  testEnvironment: 'node',
  testTimeout: 120000,
}
