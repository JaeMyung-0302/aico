import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload, type JWTVerifyGetKey } from 'jose'

// 테스트 전용: 로컬 RSA 키쌍으로 서명한 id_token + 그 키를 담은 JWKS (네트워크 호출 없음)
export type TestIdTokenKit = {
  jwks: JWTVerifyGetKey
  sign: (
    claims: JWTPayload,
    options?: { expiresIn?: string; issuedAt?: number; useForeignKey?: boolean },
  ) => Promise<string>
}

const KID = 'test-key-1'

export const createTestIdTokenKit = async (): Promise<TestIdTokenKit> => {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const foreign = await generateKeyPair('RS256')
  const jwk = { ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256' }
  const jwks = createLocalJWKSet({ keys: [jwk] })
  const sign: TestIdTokenKit['sign'] = (claims, options = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .setIssuedAt(options.issuedAt)
      .setExpirationTime(options.expiresIn ?? '5m')
      .sign(options.useForeignKey ? foreign.privateKey : privateKey)
  return { jwks, sign }
}
