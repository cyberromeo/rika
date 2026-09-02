import Foundation

struct WeeklyDay: Codable, Hashable, Identifiable, Sendable {
    var date: String = ""
    var weekday: String = ""
    var workouts: Int = 0
    var minutes: Int = 0
    var calories: Int = 0
    var sets: Int = 0
    var reps: Int = 0
    var tvl: Double = 0
    var trained: Bool = false

    var id: String { date }

    enum CodingKeys: String, CodingKey {
        case date, weekday, workouts, minutes, calories, sets, reps, tvl, trained
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        date = c.flexString(.date)
        weekday = c.flexString(.weekday)
        workouts = c.flexInt(.workouts)
        minutes = c.flexInt(.minutes)
        calories = c.flexInt(.calories)
        sets = c.flexInt(.sets)
        reps = c.flexInt(.reps)
        tvl = c.flexDouble(.tvl)
        trained = c.flexBool(.trained)
    }
}

struct WeeklySummary: Codable, Hashable, Sendable {
    var weekStart: String = ""
    var daysTrained: Int = 0
    var totalWorkouts: Int = 0
    var totalMinutes: Int = 0
    var totalDuration: String = "0m"
    var totalCalories: Int = 0
    var totalSets: Int = 0
    var totalReps: Int = 0
    var totalVolumeKg: Double = 0
    var days: [WeeklyDay] = []

    enum CodingKeys: String, CodingKey {
        case days
        case weekStart = "week_start"
        case daysTrained = "days_trained"
        case totalWorkouts = "total_workouts"
        case totalMinutes = "total_minutes"
        case totalDuration = "total_duration"
        case totalCalories = "total_calories"
        case totalSets = "total_sets"
        case totalReps = "total_reps"
        case totalVolumeKg = "total_volume_kg"
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        weekStart = c.flexString(.weekStart)
        daysTrained = c.flexInt(.daysTrained)
        totalWorkouts = c.flexInt(.totalWorkouts)
        totalMinutes = c.flexInt(.totalMinutes)
        totalDuration = c.flexString(.totalDuration, default: "0m")
        totalCalories = c.flexInt(.totalCalories)
        totalSets = c.flexInt(.totalSets)
        totalReps = c.flexInt(.totalReps)
        totalVolumeKg = c.flexDouble(.totalVolumeKg)
        days = c.flexArray(.days, of: WeeklyDay.self)
    }

    /// Scale denominator for the weekly bar chart; never zero, so a rest week
    /// does not divide by nothing (GymPage.tsx:372).
    var maxMinutes: Int { max(days.map(\.minutes).max() ?? 1, 1) }
}

struct RecentWorkout: Codable, Hashable, Identifiable, Sendable {
    var id: String = ""
    var name: String = ""
    var date: String = ""
    var duration: String = ""
    var minutes: Int = 0
    var calories: Int = 0
    var volumeKg: Double = 0
    var sets: Int = 0
    var primaryMuscles: [String] = []
    var secondaryMuscles: [String] = []
    var prCount: Int = 0
    var personalRecords: [PersonalRecord] = []
    var exercises: [WorkoutExercise] = []

    enum CodingKeys: String, CodingKey {
        case id, name, date, duration, minutes, calories, sets, exercises
        case volumeKg = "volume_kg"
        case primaryMuscles = "primary_muscles"
        case secondaryMuscles = "secondary_muscles"
        case prCount = "pr_count"
        case personalRecords = "personal_records"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = c.flexString(.id)
        name = c.flexString(.name)
        date = c.flexString(.date)
        duration = c.flexString(.duration)
        minutes = c.flexInt(.minutes)
        calories = c.flexInt(.calories)
        volumeKg = c.flexDouble(.volumeKg)
        sets = c.flexInt(.sets)
        primaryMuscles = c.flexStrings(.primaryMuscles)
        secondaryMuscles = c.flexStrings(.secondaryMuscles)
        prCount = c.flexInt(.prCount)
        personalRecords = c.flexArray(.personalRecords, of: PersonalRecord.self)
        exercises = c.flexArray(.exercises, of: WorkoutExercise.self)
    }

    var hasPRs: Bool { prCount > 0 && !personalRecords.isEmpty }
    var canExpand: Bool { hasPRs || !exercises.isEmpty }
}

struct OverallStats: Codable, Hashable, Sendable {
    var lifetimeWorkouts: Int = 0
    var periodWorkouts: Int = 0
    var periodReps: Int = 0
    var periodSets: Int = 0
    var periodVolumeKg: Double = 0
    var periodCalories: Int = 0
    var periodMinutes: Int = 0
    var leaderboardRank: Int = 0
    var leaderboardPrevRank: Int = 0
    var leaderboardDelta: Int = 0
    var topExercises: [String] = []

    enum CodingKeys: String, CodingKey {
        case lifetimeWorkouts = "lifetime_workouts"
        case periodWorkouts = "period_workouts"
        case periodReps = "period_reps"
        case periodSets = "period_sets"
        case periodVolumeKg = "period_volume_kg"
        case periodCalories = "period_calories"
        case periodMinutes = "period_minutes"
        case leaderboardRank = "leaderboard_rank"
        case leaderboardPrevRank = "leaderboard_prev_rank"
        case leaderboardDelta = "leaderboard_delta"
        case topExercises = "top_exercises"
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        lifetimeWorkouts = c.flexInt(.lifetimeWorkouts)
        periodWorkouts = c.flexInt(.periodWorkouts)
        periodReps = c.flexInt(.periodReps)
        periodSets = c.flexInt(.periodSets)
        periodVolumeKg = c.flexDouble(.periodVolumeKg)
        periodCalories = c.flexInt(.periodCalories)
        periodMinutes = c.flexInt(.periodMinutes)
        leaderboardRank = c.flexInt(.leaderboardRank)
        leaderboardPrevRank = c.flexInt(.leaderboardPrevRank)
        leaderboardDelta = c.flexInt(.leaderboardDelta)
        topExercises = c.flexStrings(.topExercises)
    }
}
