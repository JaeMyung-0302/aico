import type { KakaoExportParseResult, KakaoMessage } from '@you-in-heart/shared'
import { useMemo } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { rawKey } from './useTxtImport'

type Row = { kind: 'day'; key: string; label: string } | { kind: 'message'; key: string; message: KakaoMessage }

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
// 화면에 펼쳐 보이는 못 읽은 줄 수 (그 이상은 개수만)
const MAX_RAW_SHOWN = 100

// saidAt 은 KST(+09:00) ISO → 앞 10자가 한국 날짜
const dayLabel = (saidAt: string): string => {
  const [year, month, day] = saidAt.slice(0, 10).split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)).getUTCDay()] ?? ''
  return `${year}년 ${month}월 ${day}일 ${weekday}요일`
}

const timeLabel = (saidAt: string): string => saidAt.slice(11, 16)

const toRows = (messages: readonly KakaoMessage[], query: string): Row[] => {
  const needle = query.trim()
  return messages
    .filter((message) => !needle || message.text.includes(needle) || dayLabel(message.saidAt).includes(needle))
    .flatMap((message, index, list): Row[] => {
      const label = dayLabel(message.saidAt)
      const previous = list[index - 1]
      const isNewDay = !previous || dayLabel(previous.saidAt) !== label
      const row: Row = { kind: 'message', key: message.id, message }
      return isNewDay ? [{ kind: 'day', key: `day-${message.id}`, label }, row] : [row]
    })
}

const Check = ({ isOn }: { isOn: boolean }) => (
  <View style={[styles.check, isOn ? styles.checkOn : null]}>
    {isOn ? <Icon name="check" size={12} color="bg" strokeWidth={3} /> : null}
  </View>
)

type MessageRowProps = { message: KakaoMessage; isMine: boolean; isOn: boolean; onToggle: () => void }

// 말풍선 행: 상대는 왼쪽(회색), 나는 오른쪽(흰색). 고르면 로즈 테두리
const MessageRow = ({ message, isMine, isOn, onToggle }: MessageRowProps) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityLabel={`${message.speaker} ${message.text}`}
    accessibilityState={{ checked: isOn }}
    onPress={onToggle}
    style={[styles.msg, isMine ? styles.mine : null]}
  >
    <Check isOn={isOn} />
    <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleThem, isOn ? styles.bubbleOn : null]}>
      <AppText variant="label">{message.text}</AppText>
    </View>
    <AppText variant="micro" color="ink3" style={styles.time}>
      {timeLabel(message.saidAt)}
    </AppText>
  </Pressable>
)

type UnparsedNoticeProps = {
  result: KakaoExportParseResult
  keys: ReadonlySet<string>
  onToggle: (key: string) => void
}

// SCR-15 "N줄은 읽지 못했어요": 원문 그대로 보여주고 문구로 고를 수 있다
const UnparsedNotice = ({ result, keys, onToggle }: UnparsedNoticeProps) => {
  if (result.unparsed.length === 0) return null
  return (
    <View style={styles.notice}>
      <View accessibilityRole="summary" style={styles.noticeHead}>
        <Icon name="alert" size={18} color="ink2" />
        <View style={styles.noticeTexts}>
          <AppText variant="labelStrong">{`${result.unparsed.length}줄은 읽지 못했어요`}</AppText>
          <AppText variant="caption" color="ink2">
            {`나머지 ${result.messages.length}개 메시지는 고를 수 있어요. 못 읽은 줄은 원문 그대로 보여드려요.`}
          </AppText>
        </View>
      </View>
      {result.unparsed.slice(0, MAX_RAW_SHOWN).map((line) => {
        const key = rawKey(line.lineNo)
        const isOn = keys.has(key)
        return (
          <Pressable
            key={key}
            accessibilityRole="checkbox"
            accessibilityLabel={line.raw}
            accessibilityState={{ checked: isOn }}
            onPress={() => onToggle(key)}
            style={[styles.raw, isOn ? styles.bubbleOn : null]}
          >
            <Check isOn={isOn} />
            <AppText variant="micro" color="ink2" style={styles.rawText}>
              {line.raw}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

type MessagePickListProps = {
  result: KakaoExportParseResult
  query: string
  myName: string | null
  keys: ReadonlySet<string>
  onToggle: (key: string) => void
  bottomInset: number
}

// SCR-15 "간직할 문구 고르기" 목록 (수만 줄 → FlatList 로 보이는 만큼만 그린다)
const MessagePickList = ({ result, query, myName, keys, onToggle, bottomInset }: MessagePickListProps) => {
  const rows = useMemo(() => toRows(result.messages, query), [result.messages, query])
  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
      ListHeaderComponent={<UnparsedNotice result={result} keys={keys} onToggle={onToggle} />}
      extraData={keys}
      renderItem={({ item }) =>
        item.kind === 'day' ? (
          <AppText variant="micro" color="ink3" style={styles.day}>
            {item.label}
          </AppText>
        ) : (
          <MessageRow
            message={item.message}
            isMine={myName !== null && item.message.speaker === myName}
            isOn={keys.has(item.message.id)}
            onToggle={() => onToggle(item.message.id)}
          />
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: SPACING[4], gap: 10 },
  day: { alignSelf: 'center', paddingVertical: 6 },
  msg: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  mine: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: 230, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 },
  bubbleThem: { backgroundColor: COLORS.surface },
  bubbleMine: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  bubbleOn: { backgroundColor: COLORS.blush, borderWidth: 1.5, borderColor: COLORS.accent },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  time: { fontSize: 10 },
  notice: { gap: SPACING[2], paddingBottom: SPACING[3] },
  noticeHead: { flexDirection: 'row', gap: 10, padding: SPACING[4], borderRadius: 14, backgroundColor: COLORS.surface },
  noticeTexts: { flex: 1, gap: SPACING[1] },
  raw: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING[3],
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.line,
  },
  rawText: { flex: 1, fontSize: 12 },
})

export default MessagePickList
