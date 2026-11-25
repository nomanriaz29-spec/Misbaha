import Foundation
import MapKit

// Runs MosqueSearch against Apple Maps on an iOS simulator and prints what it finds for a few cities.
// Fails only if every city errors out (no network, or the search code is broken).
@main
struct MosqueSearchCheck {
  static func main() {
    let cities: [(String, Double, Double)] = [
      ("Lahore (Gulberg)", 31.52, 74.35), ("Karachi (Clifton)", 24.81, 67.03),
      ("Dubai (Deira)", 25.27, 55.31), ("London (Whitechapel)", 51.52, -0.06),
    ]
    var errors = 0
    var report = ""
    for (name, lat, lng) in cities {
      let done = DispatchSemaphore(value: 0)
      var rows: [[String: Any]] = []
      var err: Error?
      DispatchQueue.main.async {
        MosqueSearch.search(latitude: lat, longitude: lng, radius: 3000) { r, e in rows = r; err = e; done.signal() }
      }
      while done.wait(timeout: .now() + 0.05) == .timedOut { RunLoop.main.run(until: Date().addingTimeInterval(0.05)) }
      if let err = err { errors += 1; report += "\(name): ERROR \(err.localizedDescription)\n"; continue }
      report += "\(name): \(rows.count) mosques\n"
      for r in rows.prefix(5) {
        let n = r["name"] as? String ?? "?", d = r["distanceKm"] as? Double ?? 0
        report += String(format: "   %.1f km  %@\n", d, n)
      }
    }
    print(report)
    if CommandLine.arguments.count > 1 { try? report.write(toFile: CommandLine.arguments[1], atomically: true, encoding: .utf8) }
    exit(errors == cities.count ? 1 : 0)
  }
}
