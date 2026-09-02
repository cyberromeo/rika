import Foundation

/// The six axes the radar plots, in clockwise render order starting from the
/// top-left spoke. Chest and Arms sit adjacent so a push-and-pull week reads as
/// a filled wedge rather than a straight line (src/api/motra.ts:317).
enum MuscleGroupAxis: String, CaseIterable, Identifiable, Sendable {
    case back, shoulders, core, arms, chest, legs

    var id: String { rawValue }

    var label: String {
        switch self {
        case .back: return "Back"
        case .shoulders: return "Shoulders"
        case .core: return "Core"
        case .arms: return "Arms"
        case .chest: return "Chest"
        case .legs: return "Legs"
        }
    }
}

struct MuscleGroupStat: Codable, Hashable, Sendable {
    var group: String = ""
    var reps: Int = 0
    var sets: Int = 0
    var volumeKg: Double = 0

    enum CodingKeys: String, CodingKey {
        case group, reps, sets
        case volumeKg = "volume_kg"
    }

    init(group: String = "", reps: Int = 0, sets: Int = 0, volumeKg: Double = 0) {
        self.group = group
        self.reps = reps
        self.sets = sets
        self.volumeKg = volumeKg
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        group = c.flexString(.group)
        reps = c.flexInt(.reps)
        sets = c.flexInt(.sets)
        volumeKg = c.flexDouble(.volumeKg)
    }
}

enum RadarMetric: String, CaseIterable, Identifiable, Sendable {
    case reps, sets, volume

    var id: String { rawValue }

    var label: String {
        switch self {
        case .reps: return "Reps"
        case .sets: return "Sets"
        case .volume: return "Volume"
        }
    }

    func value(_ stat: MuscleGroupStat) -> Double {
        switch self {
        case .reps: return Double(stat.reps)
        case .sets: return Double(stat.sets)
        case .volume: return stat.volumeKg
        }
    }

    func display(_ stat: MuscleGroupStat) -> String {
        switch self {
        case .reps: return Format.number(stat.reps)
        case .sets: return Format.number(stat.sets)
        case .volume: return stat.volumeKg > 0 ? Format.volume(stat.volumeKg) : "0"
        }
    }
}

/// Group names the API may use that don't match an axis name outright
/// (`GROUP_ALIASES`, src/api/motra.ts:330).
private let groupAliases: [String: MuscleGroupAxis] = [
    "abs": .core,
    "obliques": .core,
    "biceps": .arms,
    "triceps": .arms,
    "forearms": .arms,
    "lats": .back,
    "traps": .back,
    "lowerback": .back,
    "lower back": .back,
    "quads": .legs,
    "hamstrings": .legs,
    "glutes": .legs,
    "calves": .legs,
]

/// The API only returns groups that have data, so fold its sparse list onto all
/// six axes with zeros for the rest — otherwise the radar collapses.
/// Ported from `normalizeMuscleGroups` (src/api/motra.ts:350).
func normalizeMuscleGroups(_ stats: [MuscleGroupStat]) -> [MuscleGroupAxis: MuscleGroupStat] {
    var out: [MuscleGroupAxis: MuscleGroupStat] = [:]
    for axis in MuscleGroupAxis.allCases {
        out[axis] = MuscleGroupStat(group: axis.rawValue)
    }

    for stat in stats {
        let key = stat.group.lowercased()
        guard let axis = MuscleGroupAxis(rawValue: key) ?? groupAliases[key] else { continue }
        out[axis]?.reps += stat.reps
        out[axis]?.sets += stat.sets
        out[axis]?.volumeKg += stat.volumeKg
    }

    return out
}
