import WidgetKit
import SwiftUI

// "Verse of the day": the app writes 30 days of verses into the App Group (src/lib/widget.js,
// updateVerseWidget), so the widget changes at midnight even if the app isn't opened.

private let vBg = Color(red: 15 / 255, green: 26 / 255, blue: 25 / 255)
private let vFg = Color(red: 233 / 255, green: 229 / 255, blue: 217 / 255)
private let vMuted = Color(red: 143 / 255, green: 162 / 255, blue: 157 / 255)
private let vBrass = Color(red: 214 / 255, green: 166 / 255, blue: 81 / 255)
private let vRule = Color(red: 36 / 255, green: 54 / 255, blue: 52 / 255)

// MARK: - Data

struct Verse: Hashable {
  let day: String // "YYYY-MM-DD" in the phone's time zone
  let surah: Int
  let ayah: Int
  let arabic: String
  let translation: String? // nil when the app is in Arabic
  let ref: String
}

struct VerseLabels {
  var title = "Verse of the day"
  var open = "Open Ratb to load today's verse"
  var rtl = false
  var lang = ""
}

struct VerseData {
  let verses: [Verse]
  var labels = VerseLabels()
}

private struct VersePayload: Decodable {
  struct Day: Decodable {
    let d: String
    let s: Int
    let a: Int
    let ar: String
    let tr: String?
    let ref: String
  }
  struct Labels: Decodable {
    let title: String?
    let open: String?
    let rtl: Bool?
    let lang: String?
  }
  let days: [Day]
  let labels: Labels?
}

func loadVerses(defaults: UserDefaults? = UserDefaults(suiteName: appGroup)) -> VerseData? {
  guard
    let raw = defaults?.string(forKey: "verses"),
    let data = raw.data(using: .utf8),
    let payload = try? JSONDecoder().decode(VersePayload.self, from: data)
  else { return nil }
  let verses = payload.days.compactMap { d -> Verse? in
    guard (1...114).contains(d.s), (1...286).contains(d.a), !d.ar.isEmpty else { return nil }
    return Verse(day: d.d, surah: d.s, ayah: d.a, arabic: d.ar, translation: d.tr, ref: d.ref)
  }
  if verses.isEmpty { return nil }
  var labels = VerseLabels()
  if let l = payload.labels {
    if let v = l.title, !v.isEmpty { labels.title = v }
    if let v = l.open, !v.isEmpty { labels.open = v }
    labels.rtl = l.rtl ?? false
    if let v = l.lang, ["en", "ar", "ur"].contains(v) { labels.lang = v }
  }
  return VerseData(verses: verses, labels: labels)
}

func verseDayKey(_ date: Date, calendar: Calendar = .current) -> String {
  let c = calendar.dateComponents([.year, .month, .day], from: date)
  return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
}

struct VerseEntry: TimelineEntry {
  let date: Date
  let verse: Verse?
  var labels = VerseLabels()
}

let sampleVerse = Verse(
  day: "", surah: 94, ayah: 6, arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
  translation: "Lo! with hardship goeth ease", ref: "Ash-Sharh 94:6")

// One entry per day from today, each starting at local midnight. When the saved days run out,
// the widget asks the user to open the app and checks again every few hours.
func buildVerseTimeline(now: Date, data: VerseData?, calendar: Calendar = .current) -> ([VerseEntry], TimelineReloadPolicy) {
  guard let data else {
    return ([VerseEntry(date: now, verse: nil)], .after(now.addingTimeInterval(3 * 3600)))
  }
  var entries: [VerseEntry] = []
  var day = calendar.startOfDay(for: now)
  for _ in 0..<31 {
    let key = verseDayKey(day, calendar: calendar)
    guard let v = data.verses.first(where: { $0.day == key }) else { break }
    entries.append(VerseEntry(date: entries.isEmpty ? now : day, verse: v, labels: data.labels))
    day = calendar.date(byAdding: .day, value: 1, to: day)!
  }
  let end = VerseEntry(date: entries.isEmpty ? now : day, verse: nil, labels: data.labels)
  entries.append(end)
  return (entries, .after(end.date.addingTimeInterval(3 * 3600)))
}

struct VerseProvider: TimelineProvider {
  func placeholder(in context: Context) -> VerseEntry {
    VerseEntry(date: Date(), verse: sampleVerse)
  }

  func getSnapshot(in context: Context, completion: @escaping (VerseEntry) -> Void) {
    let now = Date()
    if let data = loadVerses(), let e = buildVerseTimeline(now: now, data: data).0.first, e.verse != nil {
      completion(e)
    } else {
      completion(VerseEntry(date: now, verse: sampleVerse))
    }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<VerseEntry>) -> Void) {
    let (entries, policy) = buildVerseTimeline(now: Date(), data: loadVerses())
    completion(Timeline(entries: entries, policy: policy))
  }
}

// MARK: - Views

private struct ArabicText: View {
  let text: String
  let size: CGFloat
  let lines: Int

  var body: some View {
    Text(text)
      .font(.system(size: size))
      .lineSpacing(size * 0.25)
      .multilineTextAlignment(.leading)
      .lineLimit(lines)
      .minimumScaleFactor(0.55)
      .frame(maxWidth: .infinity, alignment: .leading)
      .environment(\.layoutDirection, .rightToLeft) // Arabic always reads right to left
  }
}

struct VerseWidgetView: View {
  @Environment(\.widgetFamily) private var envFamily
  let entry: VerseEntry
  var familyOverride: WidgetFamily? = nil // used by the snapshot test
  private var family: WidgetFamily { familyOverride ?? envFamily }

  var body: some View {
    content
      .environment(\.layoutDirection, entry.labels.rtl ? .rightToLeft : .leftToRight)
      .environment(\.locale, entry.labels.lang.isEmpty ? Locale.current : Locale(identifier: entry.labels.lang))
      .widgetURL(URL(string: entry.verse.map { "misbaha://quran/\($0.surah)/\($0.ayah)" } ?? "misbaha://quran"))
      .containerBackground(for: .widget) {
        if family == .accessoryRectangular { Color.clear } else { vBg }
      }
  }

  private func header(_ v: Verse) -> some View {
    HStack(alignment: .firstTextBaseline) {
      Text(entry.labels.title.uppercased())
        .font(.system(size: 11, weight: .semibold))
        .tracking(0.8)
        .foregroundStyle(vBrass)
        .lineLimit(1)
      Spacer(minLength: 6)
      Text(v.ref)
        .font(.system(size: 11))
        .foregroundStyle(vMuted)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
  }

  @ViewBuilder private var content: some View {
    if let v = entry.verse {
      switch family {
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          if let tr = v.translation {
            Text(tr).font(.system(size: 13)).lineLimit(3).minimumScaleFactor(0.7)
          } else {
            ArabicText(text: v.arabic, size: 15, lines: 3)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      case .systemSmall:
        VStack(alignment: .leading, spacing: 6) {
          Text(entry.labels.title.uppercased())
            .font(.system(size: 10.5, weight: .semibold)).tracking(0.6)
            .foregroundStyle(vBrass).lineLimit(1).minimumScaleFactor(0.8)
          if let tr = v.translation {
            Text(tr)
              .font(.system(size: 14, design: entry.labels.lang == "ur" ? .default : .serif))
              .foregroundStyle(vFg).lineLimit(6).minimumScaleFactor(0.6)
              .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          } else {
            ArabicText(text: v.arabic, size: 19, lines: 5).foregroundStyle(vFg)
              .frame(maxHeight: .infinity, alignment: .top)
          }
          Text(v.ref).font(.system(size: 10.5)).foregroundStyle(vMuted).lineLimit(1).minimumScaleFactor(0.7)
        }
      case .systemLarge:
        VStack(alignment: .leading, spacing: 14) {
          header(v)
          Spacer(minLength: 0)
          ArabicText(text: v.arabic, size: 25, lines: 7).foregroundStyle(vFg)
          if let tr = v.translation {
            Rectangle().fill(vRule).frame(height: 1)
            Text(tr)
              .font(.system(size: 17, design: entry.labels.lang == "ur" ? .default : .serif))
              .foregroundStyle(vFg.opacity(0.9)).lineSpacing(3)
              .lineLimit(9).minimumScaleFactor(0.7)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
          Spacer(minLength: 0)
        }
      default: // systemMedium
        VStack(alignment: .leading, spacing: 7) {
          header(v)
          Spacer(minLength: 0)
          ArabicText(text: v.arabic, size: v.translation == nil ? 22 : 18, lines: v.translation == nil ? 4 : 2)
            .foregroundStyle(vFg)
          if let tr = v.translation {
            Text(tr)
              .font(.system(size: 13, design: entry.labels.lang == "ur" ? .default : .serif))
              .foregroundStyle(vFg.opacity(0.85))
              .lineLimit(4).minimumScaleFactor(0.7)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
          Spacer(minLength: 0)
        }
      }
    } else {
      VStack(alignment: .leading, spacing: 4) {
        Text(entry.labels.title)
          .font(.system(size: 15, weight: .semibold, design: .serif))
          .foregroundStyle(family == .accessoryRectangular ? Color.primary : vFg)
        Text(entry.labels.open)
          .font(.system(size: 12))
          .foregroundStyle(family == .accessoryRectangular ? Color.secondary : vMuted)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
  }
}

// MARK: - Widget

struct VerseOfTheDayWidget: Widget {
  let kind = "VerseOfTheDay"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: VerseProvider()) { entry in
      VerseWidgetView(entry: entry)
    }
    .configurationDisplayName("Verse of the day")
    .description("A verse of the Quran with its meaning, new every day.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
  }
}
