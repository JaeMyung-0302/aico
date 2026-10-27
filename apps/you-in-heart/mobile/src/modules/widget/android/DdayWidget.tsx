import { FlexWidget, TextWidget } from 'react-native-android-widget'

// 스파이크(0B.4): AsyncStorage `widget:snapshot` 문자열을 그대로 보여준다. Phase 1B에서 D-day 계산 위젯으로 바꾼다
interface DdayWidgetProps {
  text: string
}

export const WIDGET_NAME = 'DdayWidget'
export const SNAPSHOT_KEY = 'widget:snapshot'
export const EMPTY_SNAPSHOT_TEXT = '앱에서 로그인하면 D-day가 보여요'

const DdayWidget = ({ text }: DdayWidgetProps) => (
  <FlexWidget
    clickAction="OPEN_APP"
    style={{
      height: 'match_parent',
      width: 'match_parent',
      justifyContent: 'center',
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
    }}
  >
    <TextWidget text={text} style={{ fontSize: 16, color: '#17171A' }} />
  </FlexWidget>
)

export default DdayWidget
