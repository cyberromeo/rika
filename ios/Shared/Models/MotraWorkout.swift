import Foundation

/// One logged set inside an exercise. `phase` is `"warmup"` or `"main"`.
struct ExerciseSet: Codable, Hashable, Sendable {
    var set: Int = 0
    var phase: String = "main"
    var reps: Int?
    var weightKg: Double?
    var unit: String = "kg"
    var seconds: Int?
    var restSeconds: Double?

    var isWarmup: Bool { phase == "warmup" }

    enum CodingKeys: String, CodingKey {
        case set, phase, reps, unit, seconds
        case weightKg = "weight_kg"
        case restSeconds = "rest_seconds"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        set = c.flexInt(.set)
        phase = c.flexString(.phase, default: "main")
        reps = c.flexOptionalInt(.reps)
        weightKg = c.flexOptionalDouble(.weightKg)
        unit = c.flexString(.unit, default: "kg")
        seconds = c.flexOptionalInt(.seconds)
        restSeconds = c.flexOptionalDouble(.restSeconds)
    }
}

struct WorkoutExercise: Codable, Hashable, Identifiable, Sendable {
    var exercise: String = ""
    var exerciseID: String = ""
    var category: String = ""
    var segment: String = ""
    var primaryMuscles: [String] = []
    var secondaryMuscles: [String] = []
    var setCount: Int = 0
    var warmupSets: Int = 0
    var totalReps: Int = 0
    var topWeightKg: Double?
    var volumeKg: Double = 0
    /// Pre-formatted by the API, e.g. `"12 @ 15kg, 7 @ 15kg"`.
    var summary: String = ""
    var sets: [ExerciseSet] = []

    /// `exercise_id` repeats across a workout when the same movement appears
    /// twice, so the row index is folded in by the view instead of relying on
    /// this alone.
    var id: String { exerciseID.isEmpty ? exercise : exerciseID }

    enum CodingKeys: String, CodingKey {
        case exercise, category, segment, summary, sets
        case exerciseID = "exercise_id"
        case primaryMuscles = "primary_muscles"
        case secondaryMuscles = "secondary_muscles"
        case setCount = "set_count"
        case warmupSets = "warmup_sets"
        case totalReps = "total_reps"
        case topWeightKg = "top_weight_kg"
        case volumeKg = "volume_kg"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        exercise = c.flexString(.exercise)
        exerciseID = c.flexString(.exerciseID)
        category = c.flexString(.category)
        segment = c.flexString(.segment)
        primaryMuscles = c.flexStrings(.primaryMuscles)
        secondaryMuscles = c.flexStrings(.secondaryMuscles)
        setCount = c.flexInt(.setCount)
        warmupSets = c.flexInt(.warmupSets)
        totalReps = c.flexInt(.totalReps)
        topWeightKg = c.flexOptionalDouble(.topWeightKg)
        volumeKg = c.flexDouble(.volumeKg)
        summary = c.flexString(.summary)
        sets = c.flexArray(.sets, of: ExerciseSet.self)
    }
}

struct PersonalRecord: Codable, Hashable, Sendable {
    var exercise: String = ""
    var type: String = ""
    var weightKg: Double?
    var reps: Int?

    enum CodingKeys: String, CodingKey {
        case exercise, type, reps
        case weightKg = "weight_kg"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        exercise = c.flexString(.exercise)
        type = c.flexString(.type)
        weightKg = c.flexOptionalDouble(.weightKg)
        reps = c.flexOptionalInt(.reps)
    }

    /// The single value the row shows: weight if there is one, else reps, else
    /// the record type (SessionRow, GymPage.tsx:235).
    var display: String {
        if let weightKg { return "\(Format.trim(weightKg)) kg" }
        if let reps { return "\(reps) reps" }
        return type
    }
}
