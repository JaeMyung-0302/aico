import { nodeConfig } from '@repo/eslint-config/node'

// coupleId 필드가 있는 테넌트 모델(CoupleMember 제외: userId 유니크로 커플을 찾는 진입점). 새 커플 모델이 생기면 추가한다
const TENANT_MODELS = [
  'anniversary',
  'diaryEntry',
  'photo',
  'place',
  'bucketItem',
  'quote',
  'notificationLog',
  'exportJob',
  'eventLog',
]

// 테넌트 모델의 findUnique(OrThrow)는 where에 coupleId(또는 복합 유니크 coupleId_id)가 있어야 한다(implementation-plan 1C.3).
// 비테넌트 모델(User·AuthAccount·Session·CoupleMember·PushToken 등)은 모델 이름으로 걸러 예외가 된다
const tenantFindUniqueSelector = [
  'CallExpression',
  "[callee.type='MemberExpression']",
  '[callee.property.name=/^findUnique(OrThrow)?$/]',
  `[callee.object.property.name=/^(${TENANT_MODELS.join('|')})$/]`,
  ':not(:has(Property[key.name=/^coupleId(_id)?$/]))',
].join('')

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nodeConfig,
  {
    ignores: ['dist/**', 'src/generated/**'],
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: tenantFindUniqueSelector,
          message:
            '테넌트 모델은 findFirst({ where: { id, coupleId } }) 또는 where에 coupleId/coupleId_id를 넣어 조회하세요',
        },
      ],
    },
  },
]
