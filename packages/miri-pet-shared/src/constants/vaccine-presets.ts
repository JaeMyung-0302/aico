import type { VaccineType } from '../schemas/vaccination'

export const VACCINE_PRESETS: ReadonlyArray<{ type: VaccineType; label: string }> = [
  { type: 'DHPPL', label: '종합백신(DHPPL)' },
  { type: 'RABIES', label: '광견병' },
  { type: 'CORONA', label: '코로나장염' },
  { type: 'KENNEL_COUGH', label: '켄넬코프' },
  { type: 'INFLUENZA', label: '인플루엔자' },
  { type: 'HEARTWORM', label: '심장사상충' },
  { type: 'ETC', label: '직접 입력' },
]
