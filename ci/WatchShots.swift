import SwiftUI

// Screenshot harness for the Apple Watch app. CI builds this with the real watch views
// (targets/watch, minus RatbWatchApp.swift) into a small simulator app, then launches it
// once per screen with SHOT=list|counter|routine and saves a simulator screenshot.
// The counts below are sample data so the screens don't look empty.

private let shotStore: CountStore = {
  if let id = Bundle.main.bundleIdentifier {
    UserDefaults.standard.removePersistentDomain(forName: id)
  }
  let store = CountStore()
  store.add("subhan", 21)
  store.add("hamd", 33)
  store.add("akbar", 12)
  store.add("astaghfir", 100)
  store.add("After Salah-0", 3)
  store.add("After Salah-1", 17)
  return store
}()

@main
struct WatchShotsApp: App {
  private let screen = ProcessInfo.processInfo.environment["SHOT"] ?? "list"

  var body: some Scene {
    WindowGroup {
      content.environmentObject(shotStore)
    }
  }

  @ViewBuilder private var content: some View {
    switch screen {
    case "counter":
      NavigationStack { CounterView(dhikr: DhikrCatalog.dhikr("subhan"), key: "subhan") }
    case "routine":
      let r = DhikrCatalog.routines[0]
      NavigationStack { RoutineView(name: r.name, steps: r.steps) }
    default:
      DhikrListView()
    }
  }
}
