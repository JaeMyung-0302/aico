// 실DB 통합 테스트: miri-pet-db 컨테이너(5439)의 miripet_test DB를 쓴다
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/integration/.*\\.int-spec\\.ts$',
  // jose v6는 ESM 전용 → node_modules 중 jose만 ts-jest로 CJS 변환한다
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs', target: 'ES2022' } }],
  },
  transformIgnorePatterns: ['/node_modules/(?!\\.pnpm/jose@|jose/)'],
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  setupFiles: ['<rootDir>/test/integration/setup.ts'],
  testEnvironment: 'node',
  testTimeout: 20000,
}
