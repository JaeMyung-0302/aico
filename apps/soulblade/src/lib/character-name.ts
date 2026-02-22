import { supabase } from './supabase'

// 캐릭터명 제한
const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 8

// 허용 문자: 한글, 영문, 숫자만 (특수문자, 이모지, 공백 차단)
const NAME_PATTERN = /^[가-힣a-zA-Z0-9]+$/

export interface NameValidationResult {
  readonly valid: boolean
  readonly error?: string
  readonly trimmedName?: string
}

// 로컬 검증 (길이, 허용 문자)
export const validateNameLocal = (name: string): NameValidationResult => {
  const trimmed = name.trim()

  if (trimmed.length < NAME_MIN_LENGTH) {
    return { valid: false, error: `이름은 ${NAME_MIN_LENGTH}자 이상이어야 합니다.` }
  }

  if (trimmed.length > NAME_MAX_LENGTH) {
    return { valid: false, error: `이름은 ${NAME_MAX_LENGTH}자 이하여야 합니다.` }
  }

  if (!NAME_PATTERN.test(trimmed)) {
    return { valid: false, error: '한글, 영문, 숫자만 사용할 수 있습니다.' }
  }

  return { valid: true, trimmedName: trimmed }
}

// Supabase RPC로 이름 중복 검사
// NOTE: TOCTOU 경합 가능. INSERT 시 unique_violation(23505) 별도 처리 필요
export const checkNameAvailable = async (name: string): Promise<NameValidationResult> => {
  const localResult = validateNameLocal(name)
  if (!localResult.valid) return localResult

  const trimmed = localResult.trimmedName!

  try {
    const { data, error } = await supabase.rpc('sb_check_name_available', {
      p_name: trimmed,
    })

    if (error) {
      return { valid: false, error: '이름 확인 중 오류가 발생했습니다.' }
    }

    if (!data) {
      return { valid: false, error: '이미 사용 중인 이름입니다.' }
    }

    return { valid: true, trimmedName: trimmed }
  } catch {
    return { valid: false, error: '네트워크 오류가 발생했습니다.' }
  }
}
