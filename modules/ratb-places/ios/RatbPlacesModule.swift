import ExpoModulesCore

// Expo bridge for MosqueSearch: searchMosques(lat, lng, radiusMetres) -> [{ name, latitude, longitude, distanceKm, address }]
public class RatbPlacesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RatbPlaces")

    AsyncFunction("searchMosques") { (latitude: Double, longitude: Double, radius: Double, promise: Promise) in
      MosqueSearch.search(latitude: latitude, longitude: longitude, radius: radius) { results, error in
        if let error = error, results.isEmpty {
          promise.reject("E_SEARCH", error.localizedDescription)
        } else {
          promise.resolve(results)
        }
      }
    }
  }
}
