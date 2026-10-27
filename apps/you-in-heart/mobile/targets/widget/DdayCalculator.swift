import Foundation

// D-day 계산 — packages/you-in-heart-shared/src/dates/dday.ts(computeDday)와 같은 규칙.
// 숫자가 앱·Android 위젯과 같은지는 packages/you-in-heart-shared/fixtures/dday-cases.json 의 dday 케이스로 맞춘다
// (Foundation 만 쓰므로 macOS swiftc 로 이 파일과 픽스처를 함께 돌려 볼 수 있다).
// 규칙
// - 타임존은 Asia/Seoul 고정(UTC+9, DST 없음). "오늘"은 KST 날짜
// - 사귄 날 당일 = 1일(D+1). 사귄 날이 미래면 음수(D-n, D+0 없음)
// - 위젯 타임라인: 지금 항목 + 다음 KST 자정 항목 2개, 정책 .atEnd → 자정에 숫자가 네트워크 없이 바뀐다
enum DdayCalculator {
  static let timeZone = TimeZone(identifier: "Asia/Seoul") ?? TimeZone(secondsFromGMT: 9 * 60 * 60)!

  private static let secondsPerDay = 86_400

  private static let utcCalendar: Calendar = {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    return calendar
  }()

  private static let kstCalendar: Calendar = {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    return calendar
  }()

  // 'YYYY-MM-DD' → 1970-01-01 기준 일 번호. 형식이 틀리거나 달력에 없는 날짜(2/30 등)면 nil
  static func dayNumber(isoDate: String) -> Int? {
    let parts = isoDate.split(separator: "-", omittingEmptySubsequences: false)
    guard isoDate.count == 10, parts.count == 3,
      let year = Int(parts[0]), let month = Int(parts[1]), let day = Int(parts[2]),
      let date = utcCalendar.date(from: DateComponents(year: year, month: month, day: day))
    else { return nil }
    let check = utcCalendar.dateComponents([.year, .month, .day], from: date)
    guard check.year == year, check.month == month, check.day == day else { return nil }
    return Int(date.timeIntervalSince1970) / secondsPerDay
  }

  // 지금 시각의 KST 날짜 일 번호
  static func kstDayNumber(_ now: Date) -> Int {
    let seconds = Int(now.timeIntervalSince1970.rounded(.down)) + timeZone.secondsFromGMT(for: now)
    return Int((Double(seconds) / Double(secondsPerDay)).rounded(.down))
  }

  // 함께한 일수 (computeDday().days 와 같다)
  static func days(startedOn: String, now: Date) -> Int? {
    guard let start = dayNumber(isoDate: startedOn) else { return nil }
    let diff = kstDayNumber(now) - start
    return diff >= 0 ? diff + 1 : diff
  }

  // 기념일까지 남은 날 (오늘 = 0, 지났으면 음수)
  static func daysUntil(isoDate: String, now: Date) -> Int? {
    guard let target = dayNumber(isoDate: isoDate) else { return nil }
    return target - kstDayNumber(now)
  }

  // 앱 toCountdownLabel 과 같은 표기: "D-87", 당일은 "D-day"
  static func countdownLabel(daysLeft: Int) -> String {
    daysLeft == 0 ? "D-day" : "D-\(daysLeft)"
  }

  // 다음 KST 자정 (타임라인 두 번째 항목 시각)
  static func nextMidnight(after now: Date) -> Date {
    let startOfToday = kstCalendar.startOfDay(for: now)
    return kstCalendar.date(byAdding: .day, value: 1, to: startOfToday) ?? now.addingTimeInterval(TimeInterval(secondsPerDay))
  }
}
