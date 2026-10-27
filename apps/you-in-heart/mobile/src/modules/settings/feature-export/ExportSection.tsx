import type { ExportJob } from '@you-in-heart/shared'
import { toKstDate } from '@you-in-heart/shared'
import { Linking, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import ListRow from '@/design-system/components/ListRow'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { isApiErrorKind } from '@/shared/api/api-error'
import { useNow } from '@/shared/hooks/use-now'
import { fetchExportJob } from './export-api'
import { useLatestExport, useRequestExport } from './useExport'

const MINUTE_MS = 60_000
const KST_OFFSET_MS = 9 * 60 * MINUTE_MS

type ExportView = 'idle' | 'running' | 'ready'

// 만료된 링크·실패한 작업은 새로 요청할 수 있는 상태(idle)로 본다
const toView = (job: ExportJob | null | undefined, nowMs: number): ExportView => {
  if (job?.status === 'PENDING' || job?.status === 'RUNNING') return 'running'
  const isLinkAlive = job?.downloadUrl && job.expiresAt && Date.parse(job.expiresAt) > nowMs
  return job?.status === 'READY' && isLinkAlive ? 'ready' : 'idle'
}

// "2026. 10. 28 12:00" (KST)
const formatKstDateTime = (iso: string): string => {
  const time = new Date(Date.parse(iso) + KST_OFFSET_MS).toISOString().slice(11, 16)
  return `${toKstDate(iso).replaceAll('-', '. ')} ${time}`
}

const errorMessageOf = (error: unknown): string =>
  isApiErrorKind(error, 'PURGE_IMMINENT')
    ? '곧 기록이 삭제돼 내보내기를 시작할 수 없어요'
    : '내보내기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요'

const RunningCard = () => (
  <View style={styles.card}>
    <AppText variant="labelStrong">내보내기 준비 중</AppText>
    <View style={styles.track}>
      <View style={styles.indeterminate} />
    </View>
    <AppText variant="micro" color="ink2" style={styles.caption}>
      다 되면 알림으로 알려드려요. 링크는 24시간 동안 유효해요.
    </AppText>
  </View>
)

// 서명 URL 은 10분이라 화면에 오래 둔 링크는 만료됐을 수 있다 → 누를 때 새로 받아 연다
const openDownload = async (jobId: string): Promise<void> => {
  const fresh = await fetchExportJob(jobId)
  if (fresh.downloadUrl) await Linking.openURL(fresh.downloadUrl)
}

const ReadyCard = ({ job }: { job: ExportJob }) => (
  <View style={styles.card}>
    <AppText variant="labelStrong">내보내기가 준비됐어요</AppText>
    {job.expiresAt ? (
      <AppText variant="micro" color="ink2" style={styles.caption}>
        {`${formatKstDateTime(job.expiresAt)}까지 받을 수 있어요`}
      </AppText>
    ) : null}
    <Button
      label="zip 내려받기"
      variant="dark"
      size="md"
      onPress={() => {
        openDownload(job.id).catch(() => undefined)
      }}
      style={styles.download}
    />
  </View>
)

// SCR-16 "모든 기록 내보내기"(사진 원본 포함 zip). 요청 → 진행(5초 확인·완료 푸시) → 다운로드 링크. 유예 중에도 쓸 수 있다
const ExportSection = () => {
  const nowMs = useNow(MINUTE_MS)
  const latest = useLatestExport()
  const request = useRequestExport()
  const view = toView(latest.data, nowMs)

  if (view === 'running') return <RunningCard />
  if (view === 'ready' && latest.data) return <ReadyCard job={latest.data} />
  return (
    <View>
      <ListRow
        title="모든 기록 내보내기"
        value="사진 원본 포함 · zip"
        trailing={null}
        isDisabled={request.isPending || latest.isPending}
        onPress={() => request.mutate()}
      />
      {latest.data?.status === 'FAILED' && !request.isError ? (
        <AppText variant="caption" color="ink2" style={styles.note}>
          지난 내보내기를 마치지 못했어요. 다시 요청해 주세요
        </AppText>
      ) : null}
      {request.isError ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert" style={styles.note}>
          {errorMessageOf(request.error)}
        </AppText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    marginHorizontal: SPACING.screen,
    marginVertical: SPACING[2],
    padding: 18,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  indeterminate: { width: '32%', height: 6, borderRadius: 3, backgroundColor: COLORS.ink },
  caption: { fontSize: 12, lineHeight: 19 },
  download: { alignSelf: 'flex-start', marginTop: SPACING[1] },
  note: { paddingHorizontal: SPACING.screen, paddingBottom: SPACING[2] },
})

export default ExportSection
