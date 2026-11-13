import Foundation

struct Dhikr: Identifiable, Hashable {
  let id: String
  let arabic: String
  let name: String
  let target: Int // 0 = no target
}

enum DhikrCatalog {
  static let all: [Dhikr] = [
    Dhikr(id: "subhan", arabic: "سُبْحَانَ اللَّهِ", name: "SubhanAllah", target: 33),
    Dhikr(id: "hamd", arabic: "الْحَمْدُ لِلَّهِ", name: "Alhamdulillah", target: 33),
    Dhikr(id: "akbar", arabic: "اللَّهُ أَكْبَرُ", name: "Allahu Akbar", target: 34),
    Dhikr(id: "tahlil", arabic: "لَا إِلَٰهَ إِلَّا اللَّهُ", name: "La ilaha illallah", target: 100),
    Dhikr(id: "astaghfir", arabic: "أَسْتَغْفِرُ اللَّهَ", name: "Astaghfirullah", target: 100),
    Dhikr(id: "subhanBihamdihi", arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", name: "SubhanAllahi wa bihamdihi", target: 100),
    Dhikr(id: "salawat", arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ", name: "Salawat", target: 100),
    Dhikr(id: "hawla", arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", name: "La hawla wa la quwwata", target: 100),
    Dhikr(id: "free", arabic: "ذِكْرُ اللَّهِ", name: "Free count", target: 0),
  ]

  // Routines: a sequence of (dhikr, count).
  static let routines: [(id: String, name: String, steps: [(String, Int)])] = [
    ("salah", "After Salah", [("astaghfir", 3), ("subhan", 33), ("hamd", 33), ("akbar", 33)]),
    ("sleep", "Before sleep", [("subhan", 33), ("hamd", 33), ("akbar", 34)]),
  ]

  static func dhikr(_ id: String) -> Dhikr { all.first { $0.id == id } ?? all[0] }
}
