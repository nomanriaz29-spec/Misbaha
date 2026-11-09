import SwiftUI
import WatchKit

private let brass = Color(red: 214 / 255, green: 166 / 255, blue: 81 / 255)
private let muted = Color(red: 143 / 255, green: 162 / 255, blue: 157 / 255)

struct DhikrListView: View {
  @EnvironmentObject var store: CountStore

  var body: some View {
    NavigationStack {
      List {
        Section {
          Text("Today \(store.total)")
            .font(.footnote)
            .foregroundStyle(muted)
        }
        Section("Routines") {
          ForEach(DhikrCatalog.routines, id: \.id) { r in
            NavigationLink(r.name) { RoutineView(name: r.name, steps: r.steps) }
          }
        }
        Section("Tasbeeh") {
          ForEach(DhikrCatalog.all) { d in
            NavigationLink {
              CounterView(dhikr: d, key: d.id)
            } label: {
              VStack(alignment: .leading, spacing: 2) {
                Text(d.name).font(.headline)
                Text(progressText(d)).font(.caption2).foregroundStyle(muted)
              }
            }
          }
        }
      }
      .navigationTitle("Ratb")
    }
  }

  private func progressText(_ d: Dhikr) -> String {
    let c = store.count(d.id)
    return d.target > 0 ? "\(c) / \(d.target)" : "\(c)"
  }
}

// Counts one dhikr. Tap anywhere or turn the Digital Crown.
struct CounterView: View {
  @EnvironmentObject var store: CountStore
  let dhikr: Dhikr
  let key: String
  var target: Int? = nil
  var onComplete: (() -> Void)? = nil

  @State private var crown: Double = 0
  @State private var lastCrown: Int = 0
  @State private var confirmReset = false

  private var goal: Int { target ?? dhikr.target }
  private var count: Int { store.count(key) }
  private var done: Bool { goal > 0 && count >= goal }

  var body: some View {
    VStack(spacing: 4) {
      Text(dhikr.arabic)
        .font(.system(size: 17))
        .lineLimit(2)
        .minimumScaleFactor(0.6)
        .multilineTextAlignment(.center)
      ZStack {
        Circle().stroke(Color.white.opacity(0.15), lineWidth: 6)
        Circle()
          .trim(from: 0, to: progress)
          .stroke(done ? Color.green : brass, style: StrokeStyle(lineWidth: 6, lineCap: .round))
          .rotationEffect(.degrees(-90))
        VStack(spacing: 0) {
          Text("\(count)")
            .font(.system(size: 40, weight: .light, design: .serif))
            .monospacedDigit()
          Text(done ? "Complete" : goal > 0 ? "of \(goal)" : "no target")
            .font(.caption2)
            .foregroundStyle(done ? Color.green : muted)
        }
      }
      .frame(maxWidth: 120, maxHeight: 120)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .contentShape(Rectangle())
    .onTapGesture { increment() }
    .focusable()
    .digitalCrownRotation($crown, from: 0, through: 100_000, by: 1, sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: false)
    .onChange(of: crown) { _, value in
      let step = Int(value.rounded())
      if step > lastCrown { for _ in 0..<(step - lastCrown) { increment() } }
      lastCrown = step
    }
    .navigationTitle(dhikr.name)
    .toolbar {
      ToolbarItem(placement: .bottomBar) {
        Button(confirmReset ? "Tap again" : "Reset") {
          if confirmReset { store.reset(key); confirmReset = false } else { confirmReset = true }
        }
        .tint(confirmReset ? brass : nil)
      }
    }
  }

  private var progress: CGFloat {
    if goal > 0 { return CGFloat(min(count, goal)) / CGFloat(goal) }
    return CGFloat(count % 33) / 33
  }

  private func increment() {
    guard !done else { return }
    store.add(key)
    let c = store.count(key)
    if goal > 0 && c == goal {
      WKInterfaceDevice.current().play(.success)
      onComplete?()
    } else if c % 33 == 0 {
      WKInterfaceDevice.current().play(.notification)
    } else {
      WKInterfaceDevice.current().play(.click)
    }
  }
}

// Walks through a routine's steps, moving on when each target is reached.
struct RoutineView: View {
  @EnvironmentObject var store: CountStore
  let name: String
  let steps: [(String, Int)]
  @State private var index = 0

  var body: some View {
    let (id, target) = steps[min(index, steps.count - 1)]
    let key = "\(name)-\(index)"
    VStack(spacing: 2) {
      CounterView(dhikr: DhikrCatalog.dhikr(id), key: key, target: target) {
        if index < steps.count - 1 {
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { index += 1 }
        }
      }
      .id(key)
      Text("Step \(index + 1) of \(steps.count)")
        .font(.caption2)
        .foregroundStyle(muted)
    }
    .navigationTitle(name)
    .onAppear {
      // Start at the first unfinished step.
      index = steps.indices.first { store.count("\(name)-\($0)") < steps[$0].1 } ?? 0
    }
  }
}
