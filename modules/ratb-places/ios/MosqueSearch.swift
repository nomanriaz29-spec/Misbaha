import Foundation
import MapKit

// Finds mosques near a point with Apple Maps (MKLocalSearch), which lists far more mosques than
// OpenStreetMap in Pakistan and the Gulf. Plain MapKit, no Expo types, so CI can run it on a simulator.
public enum MosqueSearch {
  // Queries run in parallel; results are merged, de-duplicated and sorted by distance.
  static let queries = ["mosque", "masjid", "مسجد", "jamia masjid"]

  public static func search(latitude: Double, longitude: Double, radius: Double,
                            completion: @escaping ([[String: Any]], Error?) -> Void) {
    let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    let region = MKCoordinateRegion(center: center, latitudinalMeters: radius * 2, longitudinalMeters: radius * 2)
    let here = CLLocation(latitude: latitude, longitude: longitude)
    let group = DispatchGroup()
    let lock = NSLock()
    var items: [MKMapItem] = []
    var lastError: Error?

    for q in queries {
      group.enter()
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = q
      request.region = region
      request.resultTypes = .pointOfInterest
      MKLocalSearch(request: request).start { response, error in
        lock.lock()
        if let response = response { items.append(contentsOf: response.mapItems) }
        if let error = error { lastError = error }
        lock.unlock()
        group.leave()
      }
    }

    group.notify(queue: .main) {
      var seen: [CLLocation] = []
      var out: [[String: Any]] = []
      let sorted = items
        .compactMap { item -> (MKMapItem, CLLocation, Double)? in
          let c = item.placemark.coordinate
          guard CLLocationCoordinate2DIsValid(c) else { return nil }
          let loc = CLLocation(latitude: c.latitude, longitude: c.longitude)
          return (item, loc, loc.distance(from: here))
        }
        .filter { $0.2 <= radius * 1.5 && isMosque($0.0) }
        .sorted { $0.2 < $1.2 }
      for (item, loc, dist) in sorted {
        // Same place returned by two queries: keep the first (closest) one.
        if seen.contains(where: { $0.distance(from: loc) < 40 }) { continue }
        seen.append(loc)
        out.append([
          "name": item.name ?? "",
          "latitude": loc.coordinate.latitude,
          "longitude": loc.coordinate.longitude,
          "distanceKm": dist / 1000,
          "address": [item.placemark.thoroughfare, item.placemark.subLocality, item.placemark.locality]
            .compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", "),
        ])
        if out.count >= 30 { break }
      }
      completion(out, out.isEmpty ? lastError : nil)
    }
  }

  // Keeps places whose name or category says mosque; drops shops and schools that matched "masjid road" etc.
  static func isMosque(_ item: MKMapItem) -> Bool {
    let name = (item.name ?? "").lowercased()
    let words = ["mosque", "masjid", "musjid", "jamia", "jami", "مسجد", "جامع", "markaz", "musalla", "imambargah", "islamic centre", "islamic center"]
    return words.contains(where: { name.contains($0) })
  }
}
