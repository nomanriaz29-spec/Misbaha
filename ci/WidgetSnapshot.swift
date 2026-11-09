// Test harness for the iOS widget, run on an iOS simulator by .github/workflows/ios-check.yml.
// 1. Feeds the widget the same JSON the app writes (src/lib/widget.js) and checks the timeline logic.
// 2. Renders every widget size to PNG so the layout can be inspected.
import SwiftUI
import UIKit
import WidgetKit

private let homeBg = Color(red: 15 / 255, green: 26 / 255, blue: 25 / 255)

@main
struct WidgetSnapshot {
  static func main() {
    let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath
    let failed = MainActor.assumeIsolated { run(out: out) }
    print(failed == 0 ? "ALL PASSED" : "\(failed) FAILED")
    exit(failed == 0 ? 0 : 1)
  }

  @MainActor
  static func run(out: String) -> Int {
    var failed = 0
    func check(_ ok: Bool, _ msg: String) {
      print((ok ? "PASS  " : "FAIL  ") + msg)
      if !ok { failed += 1 }
    }
    let cal = Calendar.current
    let day0 = cal.startOfDay(for: Date())
    func at(_ day: Int, _ h: Int, _ m: Int) -> Date {
      cal.date(byAdding: .minute, value: day * 1440 + h * 60 + m, to: day0)!
    }
    let fmt = DateFormatter()
    fmt.dateFormat = "HH:mm"

    // --- Data contract -------------------------------------------------------
    let base = [(5, 11), (12, 6), (15, 15), (17, 38), (18, 54)]
    var days: [[String: Any]] = []
    for d in 0..<3 {
      let t = base.map { at(d, $0.0, $0.1 + d).timeIntervalSince1970.rounded(.down) }
      days.append(["d": "day\(d)", "t": t])
    }
    let payload: [String: Any] = ["place": "Dubai", "updated": Date().timeIntervalSince1970, "days": days]
    let json = String(data: try! JSONSerialization.data(withJSONObject: payload), encoding: .utf8)!
    let suite = UserDefaults(suiteName: "ratb.widget.snapshot")!
    suite.set(json, forKey: "prayers")
    let data = loadPrayers(defaults: suite)
    check(data?.prayers.count == 15, "reads 3 days x 5 prayers from the app's JSON (got \(data?.prayers.count ?? -1))")
    check(data?.place == "Dubai", "reads the place name")
    if let p = data?.prayers { check(zip(p, p.dropFirst()).allSatisfy { $0.date < $1.date }, "prayers sorted by time") }

    suite.set("{not json", forKey: "prayers")
    check(loadPrayers(defaults: suite) == nil, "broken data is ignored instead of crashing")
    suite.removeObject(forKey: "prayers")
    check(loadPrayers(defaults: suite) == nil, "missing data returns nil")

    guard let data = data else { return failed + 1 }

    // --- Timeline ------------------------------------------------------------
    let (afternoon, policy) = buildTimeline(now: at(0, 14, 20), data: data)
    check(afternoon.count == 11, "11 entries: now + next 10 prayers (got \(afternoon.count))")
    check(policy == .atEnd, "reloads when the timeline runs out")
    check(afternoon.first?.next?.name == "Asr", "at 14:20 the next prayer is Asr (got \(afternoon.first?.next?.name ?? "nil"))")
    check(afternoon.first?.day.map(\.name) == ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"], "today's list shows the five prayers")
    check(zip(afternoon, afternoon.dropFirst()).allSatisfy { $0.date < $1.date }, "entries in time order")

    if let ishaEntry = afternoon.first(where: { cal.isDate($0.date, equalTo: at(0, 18, 54), toGranularity: .minute) }) {
      check(ishaEntry.next?.name == "Fajr", "once Isha begins, the next prayer is tomorrow's Fajr")
      check(ishaEntry.day.allSatisfy { cal.isDate($0.date, inSameDayAs: at(1, 0, 0)) }, "after Isha the list switches to tomorrow")
    } else { check(false, "has an entry at Isha time") }

    let atAdhan = makeEntry(at: at(0, 15, 15), place: "Dubai", prayers: data.prayers)
    check(atAdhan.next?.name == "Maghrib", "exactly at Asr time the widget moves on to Maghrib")

    let (late, _) = buildTimeline(now: at(2, 23, 0), data: data)
    check(late.count == 1 && late[0].next == nil, "when the saved days run out it asks to open the app")
    let (none, nonePolicy) = buildTimeline(now: Date(), data: nil)
    check(none.count == 1 && none[0].next == nil, "no data: shows the open-the-app message")
    check(nonePolicy == .after(Date(timeIntervalSince1970: 0)) || (nonePolicy != .atEnd && nonePolicy != .never), "no data: retries later instead of giving up")

    // --- Snapshots -----------------------------------------------------------
    let dir = URL(fileURLWithPath: out)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    func save<V: View>(_ view: V, _ size: CGSize, _ name: String) {
      let r = ImageRenderer(content: view.frame(width: size.width, height: size.height).environment(\.colorScheme, .dark))
      r.scale = 3
      if let png = r.uiImage?.pngData() {
        try? png.write(to: dir.appendingPathComponent(name + ".png"))
        check(true, "rendered \(name)")
      } else {
        check(false, "rendered \(name)")
      }
    }
    func home(_ e: PrayerEntry, _ f: WidgetFamily, _ size: CGSize) -> some View {
      PrayerWidgetView(entry: e, familyOverride: f)
        .padding(16)
        .frame(width: size.width, height: size.height)
        .background(homeBg)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
    func lock(_ e: PrayerEntry, _ f: WidgetFamily, _ size: CGSize) -> some View {
      PrayerWidgetView(entry: e, familyOverride: f)
        .foregroundStyle(.white)
        .frame(width: size.width, height: size.height)
        .background(Color(white: 0.22))
        .clipShape(RoundedRectangle(cornerRadius: f == .accessoryCircular ? size.width / 2 : 12, style: .continuous))
    }
    let now = afternoon[0]
    let night = afternoon.first(where: { cal.isDate($0.date, equalTo: at(0, 18, 54), toGranularity: .minute) }) ?? now
    let empty = none[0]
    let small = CGSize(width: 170, height: 170), medium = CGSize(width: 364, height: 170)
    save(home(now, .systemSmall, small), small, "1-small")
    save(home(now, .systemMedium, medium), medium, "2-medium")
    save(home(night, .systemMedium, medium), medium, "3-medium-after-isha")
    save(home(empty, .systemSmall, small), small, "4-small-no-data")
    save(lock(now, .accessoryRectangular, CGSize(width: 172, height: 76)), CGSize(width: 172, height: 76), "5-lock-rectangular")
    save(lock(now, .accessoryCircular, CGSize(width: 76, height: 76)), CGSize(width: 76, height: 76), "6-lock-circular")
    save(lock(now, .accessoryInline, CGSize(width: 260, height: 24)), CGSize(width: 260, height: 24), "7-lock-inline")
    save(home(sampleEntry(), .systemSmall, small), small, "8-gallery-placeholder")
    _ = fmt
    return failed
  }
}
