import Foundation

struct MotraStreak: Codable, Hashable, Sendable {
    var currentDays: Int = 0
    var minutes: Int = 0
    var minutesGoal: Int = 100

    enum CodingKeys: String, CodingKey {
        case minutes
        case currentDays = "current_days"
        case minutesGoal = "minutes_goal"
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        currentDays = c.flexInt(.currentDays)
        minutes = c.flexInt(.minutes)
        minutesGoal = c.flexInt(.minutesGoal, default: 100)
    }

    var goalProgress: Double {
        guard minutesGoal > 0 else { return 0 }
        return min(1, Double(minutes) / Double(minutesGoal))
    }
}

struct MotraLifetime: Codable, Hashable, Sendable {
    var workouts: Int = 0
    var trainWorkouts: Int = 0
    var externalWorkouts: Int = 0

    enum CodingKeys: String, CodingKey {
        case workouts
        case trainWorkouts = "train_workouts"
        case externalWorkouts = "external_workouts"
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        workouts = c.flexInt(.workouts)
        trainWorkouts = c.flexInt(.trainWorkouts)
        externalWorkouts = c.flexInt(.externalWorkouts)
    }
}

struct LastWorkout: Codable, Hashable, Sendable {
    var name: String = ""
    var date: String = ""

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = c.flexString(.name)
        date = c.flexString(.date)
    }

    enum CodingKeys: String, CodingKey { case name, date }
}

/// The whole Motra payload.
///
/// Every property is non-optional with a default, which is how the web app's
/// `mergeState` (src/api/motra.ts:218) behaves at runtime — it merges the
/// response over a complete default object so no view has to null-guard. Here
/// the compiler enforces it.
struct MotraData: Codable, Hashable, Sendable {
    var overallRecovery: String = "100%"
    var recoveredMuscles: String = "18/18"
    var recoveringMuscles: Int = 0
    var daysSinceWorkout: Int = 0
    var muscles: [String: MuscleRecovery] = Muscle.all.reduce(into: [:]) {
        $0[$1] = .fullyRecovered
    }
    var updatedAt: String = ""
    var streak = MotraStreak()
    var lifetime = MotraLifetime()
    var lastWorkout: LastWorkout?
    var weekly = WeeklySummary()
    var overall = OverallStats()
    var muscleGroups: [MuscleGroupStat] = []
    var recentWorkouts: [RecentWorkout] = []
    var musclesNeedingRecovery: [MuscleNeedingRecovery] = []

    enum CodingKeys: String, CodingKey {
        case muscles, streak, lifetime, weekly, overall
        case overallRecovery = "overall_recovery"
        case recoveredMuscles = "recovered_muscles"
        case recoveringMuscles = "recovering_muscles"
        case daysSinceWorkout = "days_since_workout"
        case updatedAt = "updated_at"
        case lastWorkout = "last_workout"
        case muscleGroups = "muscle_groups"
        case recentWorkouts = "recent_workouts"
        case musclesNeedingRecovery = "muscles_needing_recovery"
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        overallRecovery = c.flexString(.overallRecovery, default: "100%")
        recoveredMuscles = c.flexString(.recoveredMuscles, default: "18/18")
        recoveringMuscles = c.flexInt(.recoveringMuscles)
        daysSinceWorkout = c.flexInt(.daysSinceWorkout)

        // Start from every muscle fully recovered, then overlay what the API
        // sent — the API omits muscles it has nothing to say about.
        var merged: [String: MuscleRecovery] = Muscle.all.reduce(into: [:]) {
            $0[$1] = .fullyRecovered
        }
        if let sent = try? c.decodeIfPresent([String: MuscleRecovery].self, forKey: .muscles) {
            for (key, value) in sent { merged[key] = value }
        }
        muscles = merged

        updatedAt = c.flexString(.updatedAt)
        streak = (try? c.decodeIfPresent(MotraStreak.self, forKey: .streak)) ?? MotraStreak()
        lifetime = (try? c.decodeIfPresent(MotraLifetime.self, forKey: .lifetime)) ?? MotraLifetime()
        lastWorkout = try? c.decodeIfPresent(LastWorkout.self, forKey: .lastWorkout)
        weekly = (try? c.decodeIfPresent(WeeklySummary.self, forKey: .weekly)) ?? WeeklySummary()
        overall = (try? c.decodeIfPresent(OverallStats.self, forKey: .overall)) ?? OverallStats()
        muscleGroups = c.flexArray(.muscleGroups, of: MuscleGroupStat.self)
        recentWorkouts = c.flexArray(.recentWorkouts, of: RecentWorkout.self)
        musclesNeedingRecovery = c.flexArray(.musclesNeedingRecovery, of: MuscleNeedingRecovery.self)
    }

    // ── Derived ─────────────────────────────────────────────────────────────

    var recoveryPercent: Int { parseRecoveryPercent(overallRecovery) }

    /// Home-widget status word (GymRecoveryWidget.tsx:54).
    var statusLabel: String {
        if recoveringMuscles == 0 { return "Fully recovered" }
        let pct = recoveryPercent
        if pct >= 90 { return "Almost ready" }
        if pct >= 70 { return "Recovering" }
        return "Rest up"
    }
}

/// `{ status: "success", data: { … } }`
struct MotraResponse: Decodable, Sendable {
    let status: String
    let data: MotraData?

    var isSuccess: Bool { status == "success" }
}
