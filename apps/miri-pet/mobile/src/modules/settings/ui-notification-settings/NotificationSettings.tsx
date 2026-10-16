import type { Me } from '@miri-pet/shared'
import Toggle from '@/design-system/components/Toggle'
import { SettingsRow, SettingsSection } from '../ui-settings-section/SettingsSection'

export type NotificationField = 'notifyVaccination' | 'notifySocial' | 'notifyDm'

type NotificationSettingsProps = {
  values: Pick<Me, NotificationField>
  onToggle: (field: NotificationField, next: boolean) => void
}

const NOTIFICATION_ITEMS: readonly { field: NotificationField; label: string }[] = [
  { field: 'notifyVaccination', label: '접종 일정' },
  { field: 'notifySocial', label: '좋아요 · 댓글 · 팔로우' },
  { field: 'notifyDm', label: '메시지' },
]

const NotificationSettings = ({ values, onToggle }: NotificationSettingsProps) => (
  <SettingsSection title="알림">
    {NOTIFICATION_ITEMS.map(({ field, label }) => (
      <SettingsRow
        key={field}
        label={label}
        trailing={<Toggle label={label} isOn={values[field]} onChange={(next) => onToggle(field, next)} />}
      />
    ))}
  </SettingsSection>
)

export default NotificationSettings
