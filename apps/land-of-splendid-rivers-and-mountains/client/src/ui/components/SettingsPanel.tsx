import { useState, type CSSProperties } from 'react'
import { t, getLocale, setLocale } from '@/i18n'
import { eventBus } from '@/lib/event-bus'

interface Props {
  readonly visible: boolean
  readonly onClose: () => void
}

const QUALITY_OPTIONS = ['high', 'medium', 'low'] as const

const SettingsPanel = ({ visible, onClose }: Props) => {
  const [locale, setLocaleState] = useState(getLocale)
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high')

  if (!visible) return null

  const handleLocaleChange = (newLocale: 'ko' | 'en') => {
    setLocaleState(newLocale)
    setLocale(newLocale)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h2 style={styles.title}>{t('ui.settings.title')}</h2>

        <div style={styles.row}>
          <span style={styles.label}>{t('ui.settings.language')}</span>
          <div style={styles.options}>
            {(['ko', 'en'] as const).map((l) => (
              <button
                key={l}
                style={locale === l ? styles.optionActive : styles.option}
                onClick={() => handleLocaleChange(l)}
              >
                {l === 'ko' ? '한국어' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>{t('ui.settings.quality')}</span>
          <div style={styles.options}>
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q}
                style={quality === q ? styles.optionActive : styles.option}
                onClick={() => {
                  setQuality(q)
                  eventBus.emit('quality:changed', { level: q })
                }}
              >
                {t(`ui.settings.quality.${q}`)}
              </button>
            ))}
          </div>
        </div>

        <button style={styles.closeBtn} onClick={onClose}>
          {t('ui.settings.close')}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)',
    zIndex: 510,
    fontFamily: '"Noto Sans KR", sans-serif',
    pointerEvents: 'auto',
  },
  panel: {
    background: 'rgba(20,20,30,0.95)',
    borderRadius: 12,
    padding: 24,
    width: 300,
    maxWidth: '90vw',
  },
  title: {
    fontSize: 20,
    color: '#fbbf24',
    margin: '0 0 20px',
    textAlign: 'center',
  },
  row: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  options: {
    display: 'flex',
    gap: 8,
  },
  option: {
    flex: 1,
    padding: '8px 0',
    fontSize: 13,
    fontFamily: '"Noto Sans KR", sans-serif',
    color: '#999',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    cursor: 'pointer',
  },
  optionActive: {
    flex: 1,
    padding: '8px 0',
    fontSize: 13,
    fontFamily: '"Noto Sans KR", sans-serif',
    color: '#fff',
    background: '#4ade80',
    border: '1px solid #4ade80',
    borderRadius: 6,
    cursor: 'pointer',
  },
  closeBtn: {
    width: '100%',
    padding: '10px 0',
    marginTop: 8,
    fontSize: 14,
    fontFamily: '"Noto Sans KR", sans-serif',
    color: '#ccc',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    cursor: 'pointer',
  },
}

export default SettingsPanel
