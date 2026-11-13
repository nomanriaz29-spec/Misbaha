import Foundation
import SwiftUI

// Keeps each dhikr's count and today's total on the watch. Counts reset each new day.
final class CountStore: ObservableObject {
  @Published private(set) var counts: [String: Int] = [:]
  @Published private(set) var total: Int = 0
  private let defaults = UserDefaults.standard

  init() {
    let today = Self.dayKey()
    if defaults.string(forKey: "day") == today {
      counts = (defaults.dictionary(forKey: "counts") as? [String: Int]) ?? [:]
      total = defaults.integer(forKey: "total")
    } else {
      defaults.set(today, forKey: "day")
      persist()
    }
  }

  static func dayKey(_ date: Date = Date()) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return "\(c.year ?? 0)-\(c.month ?? 0)-\(c.day ?? 0)"
  }

  func count(_ key: String) -> Int { counts[key] ?? 0 }

  func add(_ key: String, _ delta: Int = 1) {
    rollDayIfNeeded()
    let now = max(0, count(key) + delta)
    total = max(0, total + (now - count(key)))
    counts[key] = now
    persist()
  }

  func reset(_ key: String) {
    counts[key] = 0
    persist()
  }

  private func rollDayIfNeeded() {
    let today = Self.dayKey()
    if defaults.string(forKey: "day") != today {
      defaults.set(today, forKey: "day")
      counts = [:]
      total = 0
    }
  }

  private func persist() {
    defaults.set(counts, forKey: "counts")
    defaults.set(total, forKey: "total")
  }
}
