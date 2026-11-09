import WidgetKit
import SwiftUI

// The app writes 30 days of prayer times into this App Group (src/lib/widget.js).
let appGroup = "group.com.nomanriaz.misbaha"
private let prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]

private extension Color {
  init(hex: UInt32) {
    self.init(
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255
    )
  }
}

private let bg = Color(hex: 0x0F1A19)
private let fg = Color(hex: 0xE9E5D9)
private let muted = Color(hex: 0x8FA29D)
private let brass = Color(hex: 0xD6A651)
private let rule = Color(hex: 0x243634)

// MARK: - Data

struct Prayer: Hashable {
  let name: String
  let date: Date
}

private struct Payload: Decodable {
  struct Day: Decodable {
    let d: String
    let t: [Double] // fajr, dhuhr, asr, maghrib, isha as unix seconds
  }
  let place: String
  let days: [Day]
}

func loadPrayers(defaults: UserDefaults? = UserDefaults(suiteName: appGroup)) -> (place: String, prayers: [Prayer])? {
  guard
    let raw = defaults?.string(forKey: "prayers"),
    let data = raw.data(using: .utf8),
    let payload = try? JSONDecoder().decode(Payload.self, from: data)
  else { return nil }

  var list: [Prayer] = []
  for day in payload.days {
    for (i, ts) in day.t.enumerated() where i < prayerNames.count {
      list.append(Prayer(name: prayerNames[i], date: Date(timeIntervalSince1970: ts)))
    }
  }
  return (payload.place, list.sorted { $0.date < $1.date })
}

struct PrayerEntry: TimelineEntry {
  let date: Date
  let place: String
  let next: Prayer?
  let day: [Prayer] // the five prayers of the day the next prayer falls on
}

func makeEntry(at date: Date, place: String, prayers: [Prayer]) -> PrayerEntry {
  let next = prayers.first { $0.date > date }
  let anchor = next?.date ?? date
  let day = prayers.filter { Calendar.current.isDate($0.date, inSameDayAs: anchor) }
  return PrayerEntry(date: date, place: place, next: next, day: day)
}

// Shown in the widget gallery before the app has saved any times.
func sampleEntry() -> PrayerEntry {
  let start = Calendar.current.startOfDay(for: Date())
  let minutes = [5 * 60 + 11, 12 * 60 + 6, 15 * 60 + 15, 17 * 60 + 38, 18 * 60 + 54]
  let prayers = zip(prayerNames, minutes).map { pair in
    Prayer(name: pair.0, date: start.addingTimeInterval(Double(pair.1 * 60)))
  }
  return makeEntry(at: start.addingTimeInterval(Double(14 * 3600)), place: "Dubai", prayers: prayers)
}

// MARK: - Timeline

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerEntry {
    sampleEntry()
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
    if let data = loadPrayers() {
      completion(makeEntry(at: Date(), place: data.place, prayers: data.prayers))
    } else {
      completion(sampleEntry())
    }
  }

  // One entry now, then one at each of the next 10 prayer times, so the widget
  // moves on to the next prayer the moment one begins.
  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    let (entries, policy) = buildTimeline(now: Date(), data: loadPrayers())
    completion(Timeline(entries: entries, policy: policy))
  }
}

// Pure function so it can be tested outside WidgetKit (see ci/WidgetSnapshot.swift).
func buildTimeline(now: Date, data: (place: String, prayers: [Prayer])?) -> ([PrayerEntry], TimelineReloadPolicy) {
  guard let data = data, !data.prayers.isEmpty else {
    return ([PrayerEntry(date: now, place: "", next: nil, day: [])], .after(now.addingTimeInterval(3600)))
  }
  var dates = [now]
  dates.append(contentsOf: data.prayers.map(\.date).filter { $0 > now }.prefix(10))
  let entries = dates.map { makeEntry(at: $0, place: data.place, prayers: data.prayers) }
  return (entries, .atEnd)
}

// MARK: - Views

private struct NextBlock: View {
  let entry: PrayerEntry
  let next: Prayer

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text("NEXT PRAYER")
        .font(.system(size: 10, weight: .semibold))
        .kerning(0.8)
        .foregroundStyle(muted)
      Text(next.name)
        .font(.system(size: 26, weight: .medium, design: .serif))
        .foregroundStyle(fg)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      Text(next.date, style: .time)
        .font(.system(size: 17, weight: .semibold))
        .foregroundStyle(brass)
      Spacer(minLength: 4)
      Text("in \(next.date, style: .relative)")
        .font(.system(size: 12))
        .foregroundStyle(fg)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      Text(entry.place)
        .font(.system(size: 11))
        .foregroundStyle(muted)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

private struct DayList: View {
  let entry: PrayerEntry
  let next: Prayer

  var body: some View {
    VStack(spacing: 5) {
      ForEach(entry.day, id: \.self) { p in
        let isNext = p == next
        HStack {
          Text(p.name)
            .font(.system(size: 13, weight: isNext ? .semibold : .regular))
          Spacer()
          Text(p.date, style: .time)
            .font(.system(size: 13, weight: isNext ? .semibold : .regular))
            .monospacedDigit()
        }
        .foregroundStyle(isNext ? brass : (p.date < entry.date ? muted : fg))
      }
    }
    .frame(maxHeight: .infinity)
  }
}

struct PrayerWidgetView: View {
  @Environment(\.widgetFamily) private var envFamily
  let entry: PrayerEntry
  var familyOverride: WidgetFamily? = nil // used by the snapshot test
  private var family: WidgetFamily { familyOverride ?? envFamily }

  var body: some View {
    content
      .containerBackground(for: .widget) { background }
  }

  @ViewBuilder private var background: some View {
    switch family {
    case .systemSmall, .systemMedium:
      bg
    default:
      Color.clear
    }
  }

  @ViewBuilder private var content: some View {
    if let next = entry.next {
      switch family {
      case .accessoryInline:
        Text("\(next.name) \(next.date, style: .time)")
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          VStack(spacing: 0) {
            Text(String(next.name.prefix(3)))
              .font(.system(size: 12, weight: .semibold))
            Text(next.date, format: .dateTime.hour().minute())
              .font(.system(size: 11, weight: .medium))
              .lineLimit(1)
              .minimumScaleFactor(0.6)
          }
          .padding(4)
        }
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          Text(next.name)
            .font(.headline)
            .widgetAccentable()
          Text(next.date, style: .time)
            .font(.system(size: 15, weight: .semibold))
          Text("in \(next.date, style: .relative)")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      case .systemMedium:
        HStack(spacing: 14) {
          NextBlock(entry: entry, next: next)
          Rectangle().fill(rule).frame(width: 1)
          DayList(entry: entry, next: next)
        }
      default:
        NextBlock(entry: entry, next: next)
      }
    } else if family == .accessoryInline {
      Text("Open Misbaha")
    } else {
      VStack(alignment: .leading, spacing: 4) {
        Text("Misbaha")
          .font(.system(size: 15, weight: .semibold, design: .serif))
          .foregroundStyle(fg)
        Text("Open the app to load prayer times.")
          .font(.system(size: 12))
          .foregroundStyle(muted)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
  }
}

// MARK: - Widget

struct PrayerTimesWidget: Widget {
  let kind = "PrayerTimes"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      PrayerWidgetView(entry: entry)
    }
    .configurationDisplayName("Prayer times")
    .description("The next prayer, a countdown and today's times.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline, .accessoryCircular])
  }
}
