import AppIntents
import SwiftUI
import WidgetKit

// Salah tracker widget. Tap a prayer on the widget to tick it (iOS 17 interactive widget).
// The app writes its ticks as "salah" (src/lib/widget.js, syncSalahWidget); the widget writes its
// own as "salahEdits" (JSON data). Every tick carries the time it was made, so the newer one wins
// and the app merges the widget's ticks the next time it opens.

private let sBg = Color(red: 15 / 255, green: 26 / 255, blue: 25 / 255)
private let sFg = Color(red: 233 / 255, green: 229 / 255, blue: 217 / 255)
private let sMuted = Color(red: 143 / 255, green: 162 / 255, blue: 157 / 255)
private let sBrass = Color(red: 214 / 255, green: 166 / 255, blue: 81 / 255)
private let sOk = Color(red: 108 / 255, green: 193 / 255, blue: 153 / 255)
private let sRule = Color(red: 36 / 255, green: 54 / 255, blue: 52 / 255)

let salahKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"]

struct SalahMark: Codable, Equatable {
  var v: Int // 1 = prayed, 0 = unticked
  var at: Double // when it was changed, unix milliseconds
}
typealias SalahDays = [String: [String: SalahMark]]

struct SalahLabels {
  var title = "Salah"
  var names = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
  var streak = "day streak"
  var rtl = false
  var lang = ""
}

struct SalahState {
  var days: SalahDays = [:]
  var streak = 0
  var labels = SalahLabels()
  var appToday: [String: SalahMark] = [:] // today's ticks as the app last saw them (for the streak)
}

private struct SalahPayload: Decodable {
  struct Labels: Decodable {
    let title: String?
    let names: [String]?
    let streak: String?
    let rtl: Bool?
    let lang: String?
  }
  let days: SalahDays?
  let streak: Int?
  let labels: Labels?
}

func loadSalahEdits(defaults: UserDefaults?) -> SalahDays {
  guard let data = defaults?.data(forKey: "salahEdits"),
        let edits = try? JSONDecoder().decode(SalahDays.self, from: data) else { return [:] }
  return edits
}

func loadSalahState(defaults: UserDefaults? = UserDefaults(suiteName: appGroup), now: Date = Date()) -> SalahState {
  var state = SalahState()
  if let raw = defaults?.string(forKey: "salah"), let data = raw.data(using: .utf8),
     let p = try? JSONDecoder().decode(SalahPayload.self, from: data) {
    state.days = p.days ?? [:]
    state.streak = max(0, p.streak ?? 0)
    if let l = p.labels {
      if let v = l.title, !v.isEmpty { state.labels.title = v }
      if let v = l.names, v.count == 5 { state.labels.names = v }
      if let v = l.streak, !v.isEmpty { state.labels.streak = v }
      state.labels.rtl = l.rtl ?? false
      if let v = l.lang, ["en", "ar", "ur"].contains(v) { state.labels.lang = v }
    }
  }
  state.appToday = state.days[verseDayKey(now)] ?? [:]
  for (day, marks) in loadSalahEdits(defaults: defaults) {
    for (key, mark) in marks where salahKeys.contains(key) {
      if let cur = state.days[day]?[key], cur.at >= mark.at { continue }
      state.days[day, default: [:]][key] = mark
    }
  }
  return state
}

func salahPrayed(_ state: SalahState, day: String, key: String) -> Bool {
  state.days[day]?[key]?.v == 1
}

// Flips one prayer and saves it for the app. Returns the new value.
@discardableResult
func toggleSalah(day: String, prayer: String, defaults: UserDefaults? = UserDefaults(suiteName: appGroup), now: Date = Date()) -> Bool {
  guard salahKeys.contains(prayer) else { return false }
  let state = loadSalahState(defaults: defaults, now: now)
  let newValue = !salahPrayed(state, day: day, key: prayer)
  var edits = loadSalahEdits(defaults: defaults)
  edits[day, default: [:]][prayer] = SalahMark(v: newValue ? 1 : 0, at: (now.timeIntervalSince1970 * 1000).rounded())
  if let data = try? JSONEncoder().encode(edits) { defaults?.set(data, forKey: "salahEdits") }
  return newValue
}

struct ToggleSalahIntent: AppIntent {
  static var title: LocalizedStringResource = "Mark prayer"
  static var isDiscoverable: Bool = false

  @Parameter(title: "Prayer") var prayer: String
  @Parameter(title: "Day") var day: String

  init() {}
  init(prayer: String, day: String) {
    self.prayer = prayer
    self.day = day
  }

  func perform() async throws -> some IntentResult {
    toggleSalah(day: day, prayer: prayer)
    return .result()
  }
}

// MARK: - Timeline

struct SalahItem: Hashable {
  let key: String
  let name: String
  let time: Date?
  let prayed: Bool
  let due: Bool // its time has started, so it can be ticked
}

struct SalahEntry: TimelineEntry {
  let date: Date
  let day: String
  let items: [SalahItem]
  let streak: Int
  var labels = SalahLabels()
  var count: Int { items.filter(\.prayed).count }
}

func makeSalahEntry(at date: Date, state: SalahState, prayers: PrayerData?, calendar: Calendar = .current) -> SalahEntry {
  let day = verseDayKey(date, calendar: calendar)
  let todays = prayers?.prayers.filter { calendar.isDate($0.date, inSameDayAs: date) } ?? []
  let items = salahKeys.enumerated().map { i, key in
    let time = todays.count == 5 ? todays[i].date : nil
    return SalahItem(key: key, name: state.labels.names[i], time: time,
                     prayed: salahPrayed(state, day: day, key: key), due: time.map { $0 <= date } ?? true)
  }
  // The app's streak counts today only when all five are done; adjust for ticks made on the widget.
  let appFull = salahKeys.allSatisfy { state.appToday[$0]?.v == 1 }
  let nowFull = items.allSatisfy(\.prayed)
  var streak = state.streak
  if verseDayKey(Date(), calendar: calendar) == day {
    if nowFull && !appFull { streak += 1 }
    if !nowFull && appFull { streak = max(0, streak - 1) }
  }
  return SalahEntry(date: date, day: day, items: items, streak: streak, labels: state.labels)
}

// An entry now, one as each remaining prayer begins (so it becomes tickable), and one at midnight.
func buildSalahTimeline(now: Date, state: SalahState, prayers: PrayerData?, calendar: Calendar = .current) -> ([SalahEntry], TimelineReloadPolicy) {
  var dates = [now]
  let todays = prayers?.prayers.filter { calendar.isDate($0.date, inSameDayAs: now) && $0.date > now }.map(\.date) ?? []
  dates += todays
  let midnight = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: now)!)
  dates.append(midnight)
  let entries = dates.map { makeSalahEntry(at: $0, state: state, prayers: prayers, calendar: calendar) }
  return (entries, .after(midnight.addingTimeInterval(60)))
}

struct SalahProvider: TimelineProvider {
  func placeholder(in context: Context) -> SalahEntry { sampleSalahEntry() }

  func getSnapshot(in context: Context, completion: @escaping (SalahEntry) -> Void) {
    let defaults = UserDefaults(suiteName: appGroup)
    let entry = makeSalahEntry(at: Date(), state: loadSalahState(defaults: defaults), prayers: loadPrayers(defaults: defaults))
    completion(context.isPreview && entry.items.allSatisfy { !$0.prayed } ? sampleSalahEntry() : entry)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SalahEntry>) -> Void) {
    let defaults = UserDefaults(suiteName: appGroup)
    let (entries, policy) = buildSalahTimeline(now: Date(), state: loadSalahState(defaults: defaults), prayers: loadPrayers(defaults: defaults))
    completion(Timeline(entries: entries, policy: policy))
  }
}

func sampleSalahEntry() -> SalahEntry {
  var state = SalahState()
  let day = verseDayKey(Date())
  for k in ["fajr", "dhuhr", "asr"] { state.days[day, default: [:]][k] = SalahMark(v: 1, at: 0) }
  state.streak = 6
  return makeSalahEntry(at: Date(), state: state, prayers: nil)
}

// MARK: - Views

private struct Tick: View {
  let on: Bool
  let due: Bool
  let size: CGFloat

  var body: some View {
    ZStack {
      Circle()
        .strokeBorder(on ? sBrass : sMuted.opacity(due ? 0.7 : 0.3), lineWidth: 1.5)
        .background(Circle().fill(on ? sBrass : Color.clear))
      if on {
        Image(systemName: "checkmark")
          .font(.system(size: size * 0.45, weight: .bold))
          .foregroundStyle(sBg)
      }
    }
    .frame(width: size, height: size)
  }
}

private struct Toggleable<Label: View>: View {
  let entry: SalahEntry
  let item: SalahItem
  @ViewBuilder let label: () -> Label

  var body: some View {
    if item.due {
      Button(intent: ToggleSalahIntent(prayer: item.key, day: entry.day)) { label() }
        .buttonStyle(.plain)
    } else {
      label().opacity(0.55)
    }
  }
}

struct SalahWidgetView: View {
  @Environment(\.widgetFamily) private var envFamily
  let entry: SalahEntry
  var familyOverride: WidgetFamily? = nil // used by the snapshot test
  private var family: WidgetFamily { familyOverride ?? envFamily }

  var body: some View {
    content
      .environment(\.layoutDirection, entry.labels.rtl ? .rightToLeft : .leftToRight)
      .environment(\.locale, entry.labels.lang.isEmpty ? Locale.current : Locale(identifier: entry.labels.lang))
      .widgetURL(URL(string: "misbaha://salah"))
      .containerBackground(for: .widget) {
        switch family {
        case .systemSmall, .systemMedium: sBg
        default: Color.clear
        }
      }
  }

  private var countText: String { "\(entry.count)/5" }

  private var header: some View {
    HStack(alignment: .firstTextBaseline) {
      Text(entry.labels.title.uppercased())
        .font(.system(size: 11, weight: .semibold))
        .tracking(0.8)
        .foregroundStyle(sBrass)
        .lineLimit(1)
      Spacer(minLength: 4)
      Text(countText)
        .font(.system(size: 13, weight: .bold, design: .rounded))
        .foregroundStyle(entry.count == 5 ? sOk : sFg)
    }
  }

  @ViewBuilder private var content: some View {
    switch family {
    case .accessoryCircular:
      Gauge(value: Double(entry.count), in: 0...5) {
        Image(systemName: "checkmark")
      } currentValueLabel: {
        Text(countText).font(.system(size: 13, weight: .bold, design: .rounded))
      }
      .gaugeStyle(.accessoryCircularCapacity)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text(entry.labels.title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
          Spacer(minLength: 2)
          Text(countText).font(.system(size: 13, weight: .bold, design: .rounded))
        }
        .widgetAccentable()
        HStack(spacing: 0) {
          ForEach(entry.items, id: \.self) { item in
            VStack(spacing: 2) {
              Image(systemName: item.prayed ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 15, weight: .semibold))
                .opacity(item.prayed || item.due ? 1 : 0.4)
              if !entry.labels.rtl {
                Text(String(item.name.prefix(1)))
                  .font(.system(size: 9, weight: .semibold))
                  .lineLimit(1)
              }
            }
            .frame(maxWidth: .infinity)
          }
        }
      }
    case .systemMedium:
      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .firstTextBaseline) {
          header
        }
        HStack(spacing: 4) {
          ForEach(entry.items, id: \.self) { item in
            Toggleable(entry: entry, item: item) {
              VStack(spacing: 5) {
                Tick(on: item.prayed, due: item.due, size: 34)
                Text(item.name)
                  .font(.system(size: 12.5, weight: item.prayed ? .semibold : .regular))
                  .foregroundStyle(item.prayed ? sBrass : sFg)
                  .lineLimit(1)
                  .minimumScaleFactor(0.7)
                if let time = item.time {
                  Text(time, style: .time)
                    .font(.system(size: 10.5))
                    .foregroundStyle(sMuted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                }
              }
              .frame(maxWidth: .infinity)
              .contentShape(Rectangle())
            }
          }
        }
        Spacer(minLength: 0)
        HStack(spacing: 4) {
          Image(systemName: "flame.fill").font(.system(size: 11)).foregroundStyle(entry.streak > 0 ? sBrass : sMuted)
          Text("\(entry.streak) \(entry.labels.streak)")
            .font(.system(size: 11.5))
            .foregroundStyle(sMuted)
            .lineLimit(1)
        }
      }
    default: // systemSmall
      VStack(alignment: .leading, spacing: 5) {
        header
        VStack(spacing: 3) {
          ForEach(entry.items, id: \.self) { item in
            Toggleable(entry: entry, item: item) {
              HStack(spacing: 7) {
                Tick(on: item.prayed, due: item.due, size: 17)
                Text(item.name)
                  .font(.system(size: 13.5, weight: item.prayed ? .semibold : .regular))
                  .foregroundStyle(item.prayed ? sBrass : sFg)
                  .lineLimit(1)
                  .minimumScaleFactor(0.7)
                Spacer(minLength: 2)
                if let time = item.time {
                  Text(time, style: .time)
                    .font(.system(size: 11))
                    .foregroundStyle(sMuted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                }
              }
              .contentShape(Rectangle())
            }
          }
        }
        .frame(maxHeight: .infinity)
      }
    }
  }
}

// MARK: - Widget

struct SalahTrackerWidget: Widget {
  let kind = "SalahTracker"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SalahProvider()) { entry in
      SalahWidgetView(entry: entry)
    }
    .configurationDisplayName("Salah tracker")
    .description("Tick each prayer as you pray it, and keep your streak.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
  }
}
