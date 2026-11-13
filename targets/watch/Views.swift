import SwiftUI
import WatchKit

// Ratb's dark palette (same as the phone app's dark theme).
enum Palette {
  static let bg = Color(red: 15 / 255, green: 26 / 255, blue: 25 / 255)        // #0F1A19
  static let surface = Color(red: 22 / 255, green: 36 / 255, blue: 35 / 255)   // #162423
  static let fg = Color(red: 233 / 255, green: 229 / 255, blue: 217 / 255)     // #E9E5D9
  static let muted = Color(red: 143 / 255, green: 162 / 255, blue: 157 / 255)  // #8FA29D
  static let line = Color(red: 36 / 255, green: 54 / 255, blue: 52 / 255)      // #243634
  static let brass = Color(red: 214 / 255, green: 166 / 255, blue: 81 / 255)   // #D6A651
  static let bead = Color(red: 39 / 255, green: 58 / 255, blue: 56 / 255)      // #273A38
  static let ok = Color(red: 108 / 255, green: 193 / 255, blue: 153 / 255)     // #6CC199

  static var background: LinearGradient {
    LinearGradient(colors: [bg, .black], startPoint: .top, endPoint: .bottom)
  }
}

// MARK: - Bead ring

// A misbaha like the phone app's: n beads around a ring, the imam bead and tassel at the top.
struct BeadRing: View {
  let n: Int
  let filled: Int
  var color: Color = Palette.brass

  var body: some View {
    Canvas { ctx, size in
      let side = min(size.width, size.height)
      let c = CGPoint(x: size.width / 2, y: size.height / 2)
      let R = side / 2 - side * 0.07
      let gap = 1.8
      let step = 360 / (Double(n) + gap)
      let r = max(side * 0.012, min(side * 0.03, (2 * .pi * R / (Double(n) + gap)) * 0.34))

      // Thread
      ctx.stroke(Path(ellipseIn: CGRect(x: c.x - R, y: c.y - R, width: 2 * R, height: 2 * R)),
                 with: .color(Palette.line), lineWidth: 1)
      // Beads
      for i in 0..<n {
        let a = (-90 + step * (gap / 2 + 0.5 + Double(i))) * .pi / 180
        let p = CGPoint(x: c.x + R * cos(a), y: c.y + R * sin(a))
        let on = i < filled
        let br = i == filled - 1 ? r * 1.5 : r
        ctx.fill(Path(ellipseIn: CGRect(x: p.x - br, y: p.y - br, width: 2 * br, height: 2 * br)),
                 with: .color(on ? color : Palette.bead))
      }
      // Imam bead and tassel
      let top = c.y - R
      var tassel = Path()
      for dx in [-0.045, 0.0, 0.045] {
        tassel.move(to: CGPoint(x: c.x, y: top + side * 0.02))
        tassel.addLine(to: CGPoint(x: c.x + side * dx, y: top - side * 0.045))
      }
      ctx.stroke(tassel, with: .color(color), style: StrokeStyle(lineWidth: 1.2, lineCap: .round))
      ctx.fill(Path(ellipseIn: CGRect(x: c.x - side * 0.02, y: top - side * 0.005,
                                      width: side * 0.04, height: side * 0.075)),
               with: .color(color))
    }
    .aspectRatio(1, contentMode: .fit)
  }
}

// A small progress ring for list rows.
struct MiniRing: View {
  let progress: Double
  let done: Bool

  var body: some View {
    ZStack {
      Circle().stroke(Palette.bead, lineWidth: 3)
      Circle()
        .trim(from: 0, to: max(0.001, min(1, progress)))
        .stroke(done ? Palette.ok : Palette.brass, style: StrokeStyle(lineWidth: 3, lineCap: .round))
        .rotationEffect(.degrees(-90))
      if done {
        Image(systemName: "checkmark").font(.system(size: 9, weight: .bold)).foregroundStyle(Palette.ok)
      }
    }
    .frame(width: 22, height: 22)
  }
}

// MARK: - Home

struct DhikrListView: View {
  @EnvironmentObject var store: CountStore

  var body: some View {
    NavigationStack {
      List {
        TodayCard(total: store.total)
          .listRowBackground(Color.clear)
          .listRowInsets(EdgeInsets())

        Section {
          ForEach(DhikrCatalog.routines, id: \.id) { r in
            NavigationLink { RoutineView(name: r.name, steps: r.steps) } label: {
              HStack(spacing: 10) {
                Image(systemName: r.id == "sleep" ? "moon.stars.fill" : "sun.horizon.fill")
                  .font(.system(size: 16))
                  .foregroundStyle(Palette.brass)
                  .frame(width: 22)
                VStack(alignment: .leading, spacing: 1) {
                  Text(r.name).font(.system(size: 16, weight: .semibold)).foregroundStyle(Palette.fg)
                  Text(routineDetail(r.steps)).font(.system(size: 12)).foregroundStyle(Palette.muted)
                }
              }
              .padding(.vertical, 4)
            }
            .listRowBackground(rowBackground)
          }
        } header: {
          SectionLabel("Routines")
        }

        Section {
          ForEach(DhikrCatalog.all) { d in
            NavigationLink { CounterView(dhikr: d, key: d.id) } label: { DhikrRow(dhikr: d, count: store.count(d.id)) }
              .listRowBackground(rowBackground)
          }
        } header: {
          SectionLabel("Tasbeeh")
        }
      }
      .navigationTitle {
        Text("Ratb").foregroundStyle(Palette.brass)
      }
      .containerBackground(Palette.background, for: .navigation)
    }
    .tint(Palette.brass)
  }

  private var rowBackground: some View {
    RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Palette.surface)
  }

  private func routineDetail(_ steps: [(String, Int)]) -> String {
    steps.map { "\($0.1)" }.joined(separator: " · ")
  }
}

private struct SectionLabel: View {
  let text: String
  init(_ text: String) { self.text = text }
  var body: some View {
    Text(text.uppercased())
      .font(.system(size: 11, weight: .semibold))
      .tracking(0.8)
      .foregroundStyle(Palette.muted)
  }
}

private struct TodayCard: View {
  let total: Int

  var body: some View {
    HStack(spacing: 10) {
      BeadRing(n: 11, filled: min(11, total == 0 ? 0 : (total % 11 == 0 ? 11 : total % 11)))
        .frame(width: 36, height: 36)
      VStack(alignment: .leading, spacing: 0) {
        Text("\(total)")
          .font(.system(size: 30, weight: .light, design: .serif))
          .monospacedDigit()
          .foregroundStyle(Palette.fg)
        Text("dhikr today")
          .font(.system(size: 12))
          .foregroundStyle(Palette.muted)
      }
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 6)
    .padding(.vertical, 6)
  }
}

private struct DhikrRow: View {
  let dhikr: Dhikr
  let count: Int

  var body: some View {
    HStack(spacing: 8) {
      VStack(alignment: .leading, spacing: 1) {
        Text(dhikr.name)
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(Palette.fg)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
        Text(dhikr.arabic)
          .font(.system(size: 13))
          .foregroundStyle(Palette.brass.opacity(0.85))
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        Text(dhikr.target > 0 ? "\(count) / \(dhikr.target)" : "\(count)")
          .font(.system(size: 11))
          .monospacedDigit()
          .foregroundStyle(Palette.muted)
      }
      Spacer(minLength: 0)
      if dhikr.target > 0 {
        MiniRing(progress: Double(count) / Double(dhikr.target), done: count >= dhikr.target)
      }
    }
    .padding(.vertical, 3)
  }
}

// MARK: - Counter

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
  @State private var pulse = false

  private var goal: Int { target ?? dhikr.target }
  private var count: Int { store.count(key) }
  private var done: Bool { goal > 0 && count >= goal }

  // One bead per count when the target fits on a misbaha; otherwise the classic 33.
  private var beads: Int { goal > 0 && goal <= 40 ? goal : 33 }
  private var filled: Int {
    if goal > 0 && goal <= 40 { return min(count, goal) }
    if done { return beads }
    return count == 0 ? 0 : (count % 33 == 0 ? 33 : count % 33)
  }

  var body: some View {
    GeometryReader { geo in
      let side = min(geo.size.width, geo.size.height)
      ZStack {
        BeadRing(n: beads, filled: filled, color: done ? Palette.ok : Palette.brass)
          .frame(width: side, height: side)
        VStack(spacing: 0) {
          Text(dhikr.arabic)
            .font(.system(size: 15))
            .foregroundStyle(Palette.brass)
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .frame(maxWidth: side * 0.62)
          if done {
            Image(systemName: "checkmark")
              .font(.system(size: side * 0.22, weight: .semibold))
              .foregroundStyle(Palette.ok)
              .padding(.vertical, 2)
          } else {
            Text("\(count)")
              .font(.system(size: side * 0.27, weight: .light, design: .serif))
              .monospacedDigit()
              .foregroundStyle(Palette.fg)
              .scaleEffect(pulse ? 1.06 : 1)
              .animation(.spring(response: 0.18, dampingFraction: 0.5), value: pulse)
          }
          Text(done ? "\(count) · done" : goal > 0 ? "of \(goal)" : dhikr.name)
            .font(.system(size: 12))
            .foregroundStyle(done ? Palette.ok : Palette.muted)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: side * 0.6)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .contentShape(Rectangle())
    .onTapGesture { increment() }
    .focusable()
    .digitalCrownRotation($crown, from: 0, through: 100_000, by: 1, sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: false)
    .onChange(of: crown) { _, value in
      let step = Int(value.rounded())
      if step > lastCrown { for _ in 0..<(step - lastCrown) { increment() } }
      lastCrown = step
    }
    .navigationTitle(goal > 0 ? dhikr.name : "")
    .navigationBarTitleDisplayMode(.inline)
    .containerBackground(Palette.background, for: .navigation)
    .toolbar {
      ToolbarItemGroup(placement: .bottomBar) {
        Spacer()
        Button {
          if confirmReset { store.reset(key); confirmReset = false } else { confirmReset = true }
        } label: {
          Label(confirmReset ? "Tap to reset" : "Reset", systemImage: "arrow.counterclockwise")
            .labelStyle(.iconOnly)
        }
        .tint(confirmReset ? Palette.brass : nil)
        .accessibilityLabel(confirmReset ? "Tap again to reset" : "Reset")
      }
    }
  }

  private func increment() {
    guard !done else { return }
    store.add(key)
    confirmReset = false
    pulse.toggle()
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

// MARK: - Routine

// Walks through a routine's steps, moving on when each target is reached.
struct RoutineView: View {
  @EnvironmentObject var store: CountStore
  let name: String
  let steps: [(String, Int)]
  @State private var index = 0

  var body: some View {
    let (id, target) = steps[min(index, steps.count - 1)]
    let key = "\(name)-\(index)"
    CounterView(dhikr: DhikrCatalog.dhikr(id), key: key, target: target) {
      if index < steps.count - 1 {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { withAnimation { index += 1 } }
      }
    }
    .id(key)
    .overlay(alignment: .bottom) { stepDots.offset(y: 6) }
    .navigationTitle(name)
    .onAppear {
      // Start at the first unfinished step.
      index = steps.indices.first { store.count("\(name)-\($0)") < steps[$0].1 } ?? 0
    }
  }

  private var stepDots: some View {
    HStack(spacing: 4) {
      ForEach(steps.indices, id: \.self) { i in
        Capsule()
          .fill(i < index ? Palette.ok : i == index ? Palette.brass : Palette.bead)
          .frame(width: i == index ? 14 : 6, height: 6)
      }
    }
    .accessibilityLabel("Step \(index + 1) of \(steps.count)")
  }
}
