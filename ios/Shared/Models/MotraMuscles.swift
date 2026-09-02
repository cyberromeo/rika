import Foundation

/// The 18 muscles the Motra recovery model tracks (`MUSCLE_KEYS`).
enum Muscle {
    static let all = [
        "abductors", "abs", "adductors", "biceps", "calves", "chest",
        "forearms", "glutes", "hamstrings", "hipFlexors", "lats", "lowerBack",
        "obliques", "quads", "shoulders", "tibialisAnterior", "traps", "triceps",
    ]

    static let labels: [String: String] = [
        "abductors": "Abductors",
        "abs": "Abs",
        "adductors": "Adductors",
        "biceps": "Biceps",
        "calves": "Calves",
        "chest": "Chest",
        "forearms": "Forearms",
        "glutes": "Glutes",
        "hamstrings": "Hamstrings",
        "hipFlexors": "Hip Flexors",
        "lats": "Lats",
        "lowerBack": "Lower Back",
        "obliques": "Obliques",
        "quads": "Quads",
        "shoulders": "Shoulders",
        "tibialisAnterior": "Tibialis Ant.",
        "traps": "Traps",
        "triceps": "Triceps",
    ]

    static func label(_ key: String) -> String { labels[key] ?? key }
}

struct MuscleRecovery: Codable, Hashable, Sendable {
    var recovery: Int = 100
    var daysToRecovery: Int = 0
    /// Nil means "not trained recently", which the detail row words differently
    /// from zero days.
    var daysSinceLastUsed: Int?
    var workoutDays: [Int] = []

    static let fullyRecovered = MuscleRecovery()

    var tier: RecoveryTier { RecoveryTier(recovery: recovery) }

    enum CodingKeys: String, CodingKey {
        case recovery, daysToRecovery, daysSinceLastUsed, workoutDays
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        recovery = c.flexInt(.recovery, default: 100)
        daysToRecovery = c.flexInt(.daysToRecovery)
        daysSinceLastUsed = c.flexOptionalInt(.daysSinceLastUsed)
        workoutDays = c.flexArray(.workoutDays, of: Int.self)
    }

    /// Fatigue drives fill opacity so two muscles in the same colour band still
    /// read apart. Ported from `fillOpacityFor` (BodyHeatMap.tsx:78).
    var fillOpacity: Double {
        guard recovery < 100 else { return 1 }
        let fatigue = Double(100 - recovery)
        return min(1, 0.3 + (fatigue / 50) * 0.7)
    }
}

struct MuscleNeedingRecovery: Codable, Hashable, Identifiable, Sendable {
    var muscle: String = ""
    var recovery: Int = 0
    var daysToRecovery: Int = 0

    var id: String { muscle }
    var tier: RecoveryTier { RecoveryTier(recovery: recovery) }
    var label: String { Muscle.label(muscle) }

    enum CodingKeys: String, CodingKey {
        case muscle, recovery
        case daysToRecovery = "days_to_recovery"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        muscle = c.flexString(.muscle)
        recovery = c.flexInt(.recovery)
        daysToRecovery = c.flexInt(.daysToRecovery)
    }
}
