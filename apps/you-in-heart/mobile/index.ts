import { registerWidgetTaskHandler } from 'react-native-android-widget'
import { widgetTaskHandler } from './src/modules/widget/android/widget-task-handler'

// Android 위젯 headless task는 앱 진입점에서 등록해야 한다 (iOS에서는 no-op)
registerWidgetTaskHandler(widgetTaskHandler)

// eslint-disable-next-line import/first -- 위젯 핸들러 등록 후 라우터를 띄운다
import 'expo-router/entry'
