module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  // jose v6는 ESM 전용 → node_modules 중 jose만 ts-jest로 CJS 변환한다
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs', target: 'ES2022' } }],
  },
  transformIgnorePatterns: ['/node_modules/(?!\\.pnpm/jose@|jose/)'],
  collectCoverageFrom: ['**/*.(t|j)s', '!generated/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
}
