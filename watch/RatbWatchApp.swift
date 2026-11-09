import SwiftUI

// Ratb for Apple Watch: a standalone tasbeeh counter.
// Tap anywhere or turn the Digital Crown to count. Counts are kept on the watch.
@main
struct RatbWatchApp: App {
  @StateObject private var store = CountStore()

  var body: some Scene {
    WindowGroup {
      DhikrListView()
        .environmentObject(store)
    }
  }
}
