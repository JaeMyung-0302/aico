/**
 * 사용자가 직접 더한 선택지. 카탈로그 밖 값을 받는 유일한 통로라 모양을 좁게 정한다.
 * 값은 "custom:<group>:<이름>" 한 줄이고, 별도 표 없이 기록 안에 그대로 남는다.
 * group 은 카탈로그에 있는 묶음(부위)만, 이름은 정리한 뒤 길이 제한 안에서만 받는다.
 * tracks.ts 와 exercise.ts 가 같이 쓰므로 어느 쪽도 불러오지 않는다.
 */

export const CUSTOM_PREFIX = 'custom:'

export type CustomChoice = { group: string; name: string }

/** 앞뒤 공백을 지우고 공백 여러 개를 하나로. 제어 문자와 구분자(:)는 뺀다. */
export function cleanCustomName(raw: string): string {
  return [...raw]
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code >= 0x20 && code !== 0x7f && char !== ':'
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

export function customValue(group: string, name: string): string {
  return `${CUSTOM_PREFIX}${group}:${cleanCustomName(name)}`
}

/** 모양이 맞으면 묶음과 이름, 아니면 null. 묶음이 허용 목록에 있는지는 부르는 쪽이 본다. */
export function parseCustom(value: string): CustomChoice | null {
  if (!value.startsWith(CUSTOM_PREFIX)) return null
  const rest = value.slice(CUSTOM_PREFIX.length)
  const split = rest.indexOf(':')
  if (split <= 0) return null
  const group = rest.slice(0, split)
  const name = rest.slice(split + 1)
  if (!name || cleanCustomName(name) !== name) return null
  return { group, name }
}

/** 선택지 라벨. 직접 더한 값은 그 이름. */
export function labelFor(choices: readonly { value: string; label: string }[], value: string): string {
  return choices.find((choice) => choice.value === value)?.label ?? parseCustom(value)?.name ?? value
}
