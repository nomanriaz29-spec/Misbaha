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
    // Same days with Arabic labels, as the app writes when its language is Arabic.
    let arPayload: [String: Any] = ["place": "دبي", "updated": Date().timeIntervalSince1970, "days": days,
      "labels": ["names": ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"], "next": "الصلاة القادمة", "inPrefix": "بعد", "open": "افتح التطبيق", "rtl": true, "lang": "ar"]]
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

    suite.set(String(data: try! JSONSerialization.data(withJSONObject: arPayload), encoding: .utf8)!, forKey: "prayers")
    let arData = loadPrayers(defaults: suite)
    check(arData?.prayers.first?.name == "الفجر" && arData?.labels.rtl == true && arData?.labels.next == "الصلاة القادمة" && arData?.labels.lang == "ar", "reads Arabic prayer names and labels")
    suite.removeObject(forKey: "prayers")

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
    let arNow = arData.map { buildTimeline(now: at(0, 14, 20), data: $0).0[0] }
    let small = CGSize(width: 170, height: 170), medium = CGSize(width: 364, height: 170)
    save(home(now, .systemSmall, small), small, "1-small")
    save(home(now, .systemMedium, medium), medium, "2-medium")
    save(home(night, .systemMedium, medium), medium, "3-medium-after-isha")
    save(home(empty, .systemSmall, small), small, "4-small-no-data")
    save(lock(now, .accessoryRectangular, CGSize(width: 172, height: 76)), CGSize(width: 172, height: 76), "5-lock-rectangular")
    save(lock(now, .accessoryCircular, CGSize(width: 76, height: 76)), CGSize(width: 76, height: 76), "6-lock-circular")
    save(lock(now, .accessoryInline, CGSize(width: 260, height: 24)), CGSize(width: 260, height: 24), "7-lock-inline")
    save(home(sampleEntry(), .systemSmall, small), small, "8-gallery-placeholder")
    if let e = arNow {
      save(home(e, .systemMedium, medium), medium, "9-medium-arabic")
      save(lock(e, .accessoryRectangular, CGSize(width: 172, height: 76)), CGSize(width: 172, height: 76), "10-lock-arabic")
    }

    // --- Verse of the day -----------------------------------------------------
    func verseDefaults(_ key: String) -> UserDefaults {
      let d = UserDefaults(suiteName: "verse-test-\(key)")!
      var json = verseFixtures[key]!
      for i in 0..<3 { json = json.replacingOccurrences(of: "DAY\(i)", with: verseDayKey(at(i, 12, 0))) }
      d.set(json, forKey: "verses")
      return d
    }
    let vEn = loadVerses(defaults: verseDefaults("en"))
    let vUr = loadVerses(defaults: verseDefaults("ur"))
    let vAr = loadVerses(defaults: verseDefaults("ar"))
    check(vEn?.verses.count == 3 && vEn?.labels.title == "Verse of the day" && vEn?.labels.rtl == false, "verse: reads 3 days and English labels")
    check(vUr?.labels.rtl == true && vUr?.verses.first?.translation?.isEmpty == false, "verse: reads the Urdu translation")
    check(vAr?.labels.lang == "ar" && vAr?.verses.first?.translation == nil, "verse: Arabic shows the verse without a translation")
    let brokenV = UserDefaults(suiteName: "verse-test-broken")!
    brokenV.set("{not json", forKey: "verses")
    check(loadVerses(defaults: brokenV) == nil, "verse: broken data is ignored")
    brokenV.set(#"{"days":[{"d":"x","s":999,"a":1,"ar":"x","ref":"x"}]}"#, forKey: "verses")
    check(loadVerses(defaults: brokenV) == nil, "verse: impossible surah numbers are rejected")
    if let vEn {
      let (vt, vPolicy) = buildVerseTimeline(now: at(0, 14, 0), data: vEn)
      check(vt.count == 4, "verse: one entry per saved day plus an end entry (got \(vt.count))")
      check(vt[0].verse?.day == verseDayKey(at(0, 12, 0)), "verse: shows today's verse")
      check(vt.count > 1 && vt[1].date == cal.startOfDay(for: at(1, 0, 0)) && vt[1].verse?.day == verseDayKey(at(1, 12, 0)), "verse: switches to the next verse at midnight")
      check(vt[0].verse != vt[1].verse, "verse: a different verse each day")
      check(vt.last?.verse == nil && vPolicy != .never && vPolicy != .atEnd, "verse: when the days run out it asks to open the app and retries")
      let (lateV, _) = buildVerseTimeline(now: at(5, 9, 0), data: vEn)
      check(lateV.count == 1 && lateV[0].verse == nil, "verse: old data is not shown on the wrong day")
    }
    let (noneV, _) = buildVerseTimeline(now: Date(), data: nil)
    check(noneV.count == 1 && noneV[0].verse == nil, "verse: no data shows the open-the-app message")

    func vhome(_ e: VerseEntry, _ f: WidgetFamily, _ size: CGSize) -> some View {
      VerseWidgetView(entry: e, familyOverride: f)
        .padding(16)
        .frame(width: size.width, height: size.height)
        .background(homeBg)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
    let large = CGSize(width: 364, height: 382)
    func first(_ key: String) -> VerseEntry? {
      loadVerses(defaults: verseDefaults(key)).map { buildVerseTimeline(now: at(0, 14, 0), data: $0).0[0] }
    }
    if let e = first("en") {
      save(vhome(e, .systemSmall, small), small, "11-verse-small")
      save(vhome(e, .systemMedium, medium), medium, "12-verse-medium")
      save(vhome(e, .systemLarge, large), large, "13-verse-large")
      save(VerseWidgetView(entry: e, familyOverride: .accessoryRectangular).foregroundStyle(.white)
        .frame(width: 172, height: 76).background(Color(white: 0.22))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous)), CGSize(width: 172, height: 76), "14-verse-lock")
    }
    if let e = first("ur") { save(vhome(e, .systemMedium, medium), medium, "15-verse-medium-urdu") }
    if let e = first("ar") { save(vhome(e, .systemMedium, medium), medium, "16-verse-medium-arabic") }
    if let e = first("longEn") {
      save(vhome(e, .systemMedium, medium), medium, "17-verse-medium-longest")
      save(vhome(e, .systemLarge, large), large, "18-verse-large-longest")
      save(vhome(e, .systemSmall, small), small, "19-verse-small-longest")
    }
    if let e = first("longUr") { save(vhome(e, .systemMedium, medium), medium, "20-verse-medium-longest-urdu") }
    save(vhome(noneV[0], .systemMedium, medium), medium, "21-verse-no-data")
    save(vhome(VerseEntry(date: Date(), verse: sampleVerse), .systemSmall, small), small, "22-verse-gallery")

    // --- Today's prayers (small, all five times) ------------------------------
    check(now.day.count == 5, "today's prayers: the small widget lists all five times")
    func today(_ e: PrayerEntry, _ f: WidgetFamily, _ size: CGSize, lockStyle: Bool = false) -> some View {
      TodayPrayersView(entry: e, familyOverride: f)
        .padding(lockStyle ? 0 : 14)
        .foregroundStyle(.white)
        .frame(width: size.width, height: size.height)
        .background(lockStyle ? Color(white: 0.22) : homeBg)
        .clipShape(RoundedRectangle(cornerRadius: lockStyle ? 12 : 22, style: .continuous))
    }
    save(today(now, .systemSmall, small), small, "23-today-small")
    save(today(night, .systemSmall, small), small, "24-today-small-after-isha")
    save(today(now, .accessoryRectangular, CGSize(width: 172, height: 76), lockStyle: true), CGSize(width: 172, height: 76), "25-today-lock")
    if let e = arNow { save(today(e, .systemSmall, small), small, "26-today-small-arabic") }
    save(today(empty, .systemSmall, small), small, "27-today-no-data")
    _ = fmt
    return failed
  }
}
