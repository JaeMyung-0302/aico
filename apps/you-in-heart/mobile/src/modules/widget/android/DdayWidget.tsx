import { computeDday, toKstDate, type WidgetSnapshotV1 } from '@you-in-heart/shared'
import { FlexWidget, SvgWidget, TextWidget, type WidgetInfo } from 'react-native-android-widget'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { toCountdownLabel } from '@/modules/anniversary/util-anniversary/anniversary-view'

// app.config.ts react-native-android-widget 의 name 과 같아야 한다 (2×1, 4×2)
export const WIDGET_NAMES = ['DdayWidget', 'DdayWidgetWide'] as const
export const SNAPSHOT_KEY = 'widget:snapshot'
// SCR-17 미로그인 상태 문구(스냅샷 없음 = 로그아웃·미연결·사귄 날 없음·연결 해제)
export const EMPTY_SNAPSHOT_MESSAGE = '앱에서 로그인하면\nD-day가 보여요'

// 4×2 최소 크기(dp)보다 크면 넓은 배치. 2×1 을 늘린 경우도 같다
const WIDE_MIN_WIDTH_DP = 250
const WIDE_MIN_HEIGHT_DP = 110
// 위젯 숫자는 시스템 세리프(Noto Serif KR 13MB 를 위젯용으로 한 번 더 싣지 않는다)
const SERIF = 'serif'
// SCR-17 미로그인 하트 (Icon.tsx 의 heart 와 같은 path, 색은 토큰)
const HEART_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${COLORS.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 3.9 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.3 0 5.6 3.2 4.4 6.6C19.5 15.4 12 20 12 20z"/></svg>`

export type DdayWidgetViewModel =
  | { kind: 'empty'; message: string }
  | {
      kind: 'dday'
      size: 'small' | 'wide'
      names: string
      days: number
      next: { title: string; countdown: string } | null
    }

// D-day 는 위젯이 그릴 때마다 shared computeDday 로 직접 계산한다 → 자정에 네트워크 없이 바뀐다
export const toDdayWidgetViewModel = (
  snapshot: WidgetSnapshotV1 | null,
  info: Pick<WidgetInfo, 'width' | 'height'>,
  nowMs: number,
): DdayWidgetViewModel => {
  if (!snapshot) return { kind: 'empty', message: EMPTY_SNAPSHOT_MESSAGE }
  const isUpcoming = snapshot.next !== null && snapshot.next.date >= toKstDate(nowMs)
  return {
    kind: 'dday',
    size: info.width >= WIDE_MIN_WIDTH_DP && info.height >= WIDE_MIN_HEIGHT_DP ? 'wide' : 'small',
    names: snapshot.names.join(' · '),
    days: computeDday(snapshot.startedOn, nowMs).days,
    next:
      isUpcoming && snapshot.next
        ? { title: snapshot.next.title, countdown: toCountdownLabel(snapshot.next.date, nowMs) }
        : null,
  }
}

const Days = ({ days, size }: { days: number; size: 'small' | 'wide' }) => (
  <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
    <TextWidget
      text={String(days)}
      style={{ fontSize: size === 'wide' ? 44 : 30, fontFamily: SERIF, fontWeight: '500', color: COLORS.ink }}
    />
    <TextWidget
      text="일"
      style={{ fontSize: size === 'wide' ? 20 : 14, fontFamily: SERIF, fontWeight: '500', color: COLORS.ink }}
    />
  </FlexWidget>
)

const NextLine = ({ next }: { next: { title: string; countdown: string } }) => (
  <FlexWidget style={{ flexDirection: 'column', flexGap: 2 }}>
    <TextWidget text="다음 기념일" style={{ fontSize: 11, color: COLORS.ink3 }} />
    <FlexWidget style={{ flexDirection: 'row' }}>
      <TextWidget text={`${next.title} · `} style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }} />
      <TextWidget text={next.countdown} style={{ fontSize: 13, fontWeight: '700', color: COLORS.accent }} />
    </FlexWidget>
  </FlexWidget>
)

const ROOT_STYLE = { height: 'match_parent', width: 'match_parent', backgroundColor: COLORS.bg } as const

type DdayModel = Extract<DdayWidgetViewModel, { kind: 'dday' }>

const SignedOutLayout = ({ message }: { message: string }) => (
  <FlexWidget
    clickAction="OPEN_APP"
    style={{
      ...ROOT_STYLE,
      borderRadius: 20,
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
      flexGap: 10,
    }}
  >
    <SvgWidget svg={HEART_SVG} style={{ width: 26, height: 26 }} />
    <TextWidget text={message} style={{ fontSize: 12, color: COLORS.ink2, textAlign: 'center' }} />
  </FlexWidget>
)

const SmallLayout = ({ model }: { model: DdayModel }) => (
  <FlexWidget
    clickAction="OPEN_APP"
    style={{ ...ROOT_STYLE, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center', flexGap: 4 }}
  >
    <TextWidget text={model.names} style={{ fontSize: 11, color: COLORS.ink3 }} />
    <Days days={model.days} size="small" />
  </FlexWidget>
)

// 왼쪽 대표 사진 자리: 사진은 스냅샷에 넣지 않는다 → 자리표시 톤 (TODO: 설정의 위젯 대표 사진)
const WideLayout = ({ model }: { model: DdayModel }) => (
  <FlexWidget
    clickAction="OPEN_APP"
    style={{ ...ROOT_STYLE, borderRadius: 24, padding: 18, flexDirection: 'row', flexGap: 18 }}
  >
    <FlexWidget
      style={{ width: 140, height: 'match_parent', borderRadius: 16, backgroundColor: PHOTO_PLACEHOLDER[1] }}
    />
    <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-between' }}>
      <TextWidget text={model.names} style={{ fontSize: 12, color: COLORS.ink3 }} />
      <Days days={model.days} size="wide" />
      {model.next ? <NextLine next={model.next} /> : <TextWidget text=" " style={{ fontSize: 13 }} />}
    </FlexWidget>
  </FlexWidget>
)

// SCR-17 Android 2×1(이름 + 일수)·4×2(대표 사진 자리 + 이름·일수·다음 기념일). 누르면 앱 홈
export const DdayWidgetView = ({ model }: { model: DdayWidgetViewModel }) => {
  if (model.kind === 'empty') return <SignedOutLayout message={model.message} />
  return model.size === 'small' ? <SmallLayout model={model} /> : <WideLayout model={model} />
}

export const renderDdayWidget = (snapshot: WidgetSnapshotV1 | null, info: WidgetInfo, nowMs: number) => (
  <DdayWidgetView model={toDdayWidgetViewModel(snapshot, info, nowMs)} />
)
