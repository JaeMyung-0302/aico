import SwiftUI
import WidgetKit

// SCR-17 iOS 위젯(small·medium). 앱(src/modules/widget/data-access-widget/widget-storage.ios.ts)이
// App Group UserDefaults 의 "snapshot" 에 shared WidgetSnapshotV1 JSON 을 쓰고, D-day 는 위젯이 DdayCalculator 로 직접 계산한다.
// 색은 asset catalog(expo-target.config.js colors)에만 둔다
private let appGroup = "group.com.aico.youinheart"
private let snapshotKey = "snapshot"
private let emptyMessage = "앱에서 로그인하면\nD-day가 보여요"

// WidgetSnapshotV1 — 사귄 날·두 이름·다음 기념일만 (토큰·사진·본문·좌표 없음)
struct WidgetSnapshot: Decodable {
  struct Next: Decodable {
    let title: String
    let date: String
  }

  let v: Int
  let startedOn: String
  let names: [String]
  let next: Next?

  static let preview = WidgetSnapshot(
    v: 1, startedOn: "2025-09-10", names: ["재명", "지은"], next: Next(title: "500일", date: "2027-01-22"))
}

struct DdayEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
}

// 깨진 값·다른 버전은 버리고 미로그인 상태로 그린다
private func readSnapshot() -> WidgetSnapshot? {
  guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: snapshotKey),
    let data = raw.data(using: .utf8),
    let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data),
    snapshot.v == 1, snapshot.names.count == 2,
    DdayCalculator.dayNumber(isoDate: snapshot.startedOn) != nil
  else { return nil }
  return snapshot
}

struct DdayProvider: TimelineProvider {
  func placeholder(in context: Context) -> DdayEntry {
    DdayEntry(date: Date(), snapshot: .preview)
  }

  func getSnapshot(in context: Context, completion: @escaping (DdayEntry) -> Void) {
    let snapshot = readSnapshot()
    completion(DdayEntry(date: Date(), snapshot: context.isPreview ? (snapshot ?? .preview) : snapshot))
  }

  // 지금 + 다음 KST 자정 두 항목, 끝나면(.atEnd) 다시 받는다 → 자정에 숫자가 바뀐다
  func getTimeline(in context: Context, completion: @escaping (Timeline<DdayEntry>) -> Void) {
    let now = Date()
    let snapshot = readSnapshot()
    let entries = [
      DdayEntry(date: now, snapshot: snapshot),
      DdayEntry(date: DdayCalculator.nextMidnight(after: now), snapshot: snapshot),
    ]
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

// 표시용 값 (entry.date 기준으로 계산 → 자정 항목은 하루 뒤 숫자)
struct DdayModel {
  let names: String
  let days: Int
  // 지난 기념일(오래된 스냅샷)은 숨긴다
  let nextTitle: String?
  let countdown: String?

  init?(entry: DdayEntry) {
    guard let snapshot = entry.snapshot,
      let days = DdayCalculator.days(startedOn: snapshot.startedOn, now: entry.date)
    else { return nil }
    self.names = snapshot.names.joined(separator: " · ")
    self.days = days
    if let next = snapshot.next, let left = DdayCalculator.daysUntil(isoDate: next.date, now: entry.date), left >= 0 {
      self.nextTitle = next.title
      self.countdown = DdayCalculator.countdownLabel(daysLeft: left)
    } else {
      self.nextTitle = nil
      self.countdown = nil
    }
  }
}

private struct DaysText: View {
  let days: Int

  var body: some View {
    (Text("\(days)").font(.system(size: 40, weight: .medium, design: .serif))
      + Text("일").font(.system(size: 18, weight: .medium, design: .serif)))
      .foregroundStyle(Color("ink"))
      .lineLimit(1)
      .minimumScaleFactor(0.6)
      .accessibilityLabel("함께한 지 \(days)일")
  }
}

private struct SignedOutView: View {
  var body: some View {
    VStack(spacing: 10) {
      Image(systemName: "heart").font(.system(size: 22)).foregroundStyle(Color("accent"))
      Text(emptyMessage)
        .font(.system(size: 12))
        .foregroundStyle(Color("ink2"))
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// small: 이름 / 413일 / "500일까지 D-87"
private struct SmallView: View {
  let model: DdayModel

  var body: some View {
    VStack(alignment: .leading) {
      Text(model.names).font(.system(size: 12)).foregroundStyle(Color("ink3")).lineLimit(1)
      Spacer(minLength: 0)
      DaysText(days: model.days)
      Spacer(minLength: 0)
      if let title = model.nextTitle, let countdown = model.countdown {
        Text("\(title)까지 \(countdown)").font(.system(size: 11, weight: .bold)).foregroundStyle(Color("accent"))
          .lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

// medium: 왼쪽 대표 사진 자리(사진은 스냅샷에 넣지 않는다 → 자리표시 톤) + 오른쪽 이름·일수·다음 기념일
private struct MediumView: View {
  let model: DdayModel

  var body: some View {
    HStack(spacing: 16) {
      RoundedRectangle(cornerRadius: 14).fill(Color("photo")).frame(width: 126)
      VStack(alignment: .leading) {
        Text(model.names).font(.system(size: 12)).foregroundStyle(Color("ink3")).lineLimit(1)
        Spacer(minLength: 0)
        DaysText(days: model.days)
        Spacer(minLength: 0)
        if let title = model.nextTitle, let countdown = model.countdown {
          VStack(alignment: .leading, spacing: 2) {
            Text("다음 기념일").font(.system(size: 11)).foregroundStyle(Color("ink3"))
            (Text("\(title) · ").foregroundStyle(Color("ink")) + Text(countdown).foregroundStyle(Color("accent")))
              .font(.system(size: 13, weight: .bold))
              .lineLimit(1)
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }
}

struct DdayWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: DdayEntry

  var body: some View {
    Group {
      if let model = DdayModel(entry: entry) {
        if family == .systemMedium { MediumView(model: model) } else { SmallView(model: model) }
      } else {
        SignedOutView()
      }
    }
    .containerBackground(Color("bg"), for: .widget)
  }
}

@main
struct DdayWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "DdayWidget", provider: DdayProvider()) { entry in
      DdayWidgetView(entry: entry)
    }
    .configurationDisplayName("D-day")
    .description("함께한 날과 다음 기념일을 보여줘요")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
