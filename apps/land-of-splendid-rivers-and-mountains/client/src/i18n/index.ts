import ko from './ko.json'
import en from './en.json'
import { eventBus } from '@/lib/event-bus'

type Locale = 'ko' | 'en'

const messages: Readonly<Record<Locale, Readonly<Record<string, string>>>> = { ko, en }

let currentLocale: Locale = 'ko'

export const t = (key: string): string => messages[currentLocale][key] ?? key

export const setLocale = (locale: Locale): void => {
  if (currentLocale === locale) return
  currentLocale = locale
  eventBus.emit('locale:changed', { locale })
}

export const getLocale = (): Locale => currentLocale
