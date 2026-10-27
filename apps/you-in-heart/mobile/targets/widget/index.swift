import SwiftUI
import WidgetKit

// 스파이크(0B.3): App Group UserDefaults의 "snapshot" 문자열을 그대로 보여주는 정적 위젯.
// Phase 1B에서 {startedOn, names, next} JSON을 읽어 D-day를 위젯이 직접 계산하도록 바꾼다
private let appGroup = "group.com.aico.youinheart"

struct SnapshotEntry: TimelineEntry {
  let date: Date
  let text: String
}

struct SnapshotProvider: TimelineProvider {
  private func readSnapshot() -> String {
    UserDefaults(suiteName: appGroup)?.string(forKey: "snapshot") ?? "앱에서 로그인하면 D-day가 보여요"
  }

  func placeholder(in context: Context) -> SnapshotEntry {
    SnapshotEntry(date: Date(), text: "413일")
  }

  func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
    completion(SnapshotEntry(date: Date(), text: readSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
    completion(Timeline(entries: [SnapshotEntry(date: Date(), text: readSnapshot())], policy: .never))
  }
}

struct DdayWidgetView: View {
  let entry: SnapshotEntry

  var body: some View {
    Text(entry.text)
      .font(.system(size: 17, weight: .medium, design: .serif))
      .foregroundStyle(Color("ink"))
      .multilineTextAlignment(.leading)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .containerBackground(.white, for: .widget)
  }
}

@main
struct DdayWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "DdayWidget", provider: SnapshotProvider()) { entry in
      DdayWidgetView(entry: entry)
    }
    .configurationDisplayName("D-day")
    .description("함께한 날과 다음 기념일을 보여줘요")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
