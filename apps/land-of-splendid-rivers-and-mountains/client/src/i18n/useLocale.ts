import { useEffect, useReducer } from 'react'
import { eventBus } from '@/lib/event-bus'
import { getLocale } from '@/i18n'

/**
 * Subscribes to locale:changed events and forces a re-render,
 * ensuring components using t() display updated translations.
 */
export const useLocale = (): string => {
  const [, forceRender] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    const onLocaleChanged = () => {
      forceRender()
    }
    eventBus.on('locale:changed', onLocaleChanged)
    return () => {
      eventBus.off('locale:changed', onLocaleChanged)
    }
  }, [])

  return getLocale()
}
