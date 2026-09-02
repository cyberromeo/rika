import Foundation

/// The studytime service's whole state document.
///
/// Goal defaults match the API's (`11h` study, `2h` PYQ) so a first launch
/// before the first fetch shows the right denominators rather than zeros.
struct StudyTimeState: Codable, Hashable, Sendable {
    var currentStudyDay: String = DayKey.today
    var todayStudySeconds: Int = 0
    var todayPyqSeconds: Int = 0
    var dailyGoalSeconds: Int = 11 * 3600
    var dailyPyqGoalSeconds: Int = 2 * 3600
    var todayStudyHours: Double = 0
    var todayPyqHours: Double = 0
    var streak: Int = 0
    var streakPyq: Int = 0
    var todos: [StudyTodo] = []
    var activeTimer: ActiveTimer?
    var history: [String: Double] = [:]
    var historyPyq: [String: Double] = [:]
    var weeklyHistory: [WeeklyDayLog] = []
    var weeklyStudyTotalHours: Double = 0
    var weeklyPyqTotalHours: Double = 0
    var weeklyGrandTotalHours: Double = 0
    var lastUpdated: String?

    enum CodingKeys: String, CodingKey {
        case currentStudyDay, todayStudySeconds, todayPyqSeconds
        case dailyGoalSeconds, dailyPyqGoalSeconds
        case todayStudyHours, todayPyqHours
        case streak, streakPyq, todos, activeTimer
        case history, historyPyq, weeklyHistory
        case weeklyStudyTotalHours, weeklyPyqTotalHours, weeklyGrandTotalHours
        case lastUpdated
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        currentStudyDay = c.flexString(.currentStudyDay, default: DayKey.today)
        todayStudySeconds = c.flexInt(.todayStudySeconds)
        todayPyqSeconds = c.flexInt(.todayPyqSeconds)
        dailyGoalSeconds = c.flexInt(.dailyGoalSeconds, default: 11 * 3600)
        dailyPyqGoalSeconds = c.flexInt(.dailyPyqGoalSeconds, default: 2 * 3600)
        todayStudyHours = c.flexDouble(.todayStudyHours)
        todayPyqHours = c.flexDouble(.todayPyqHours)
        streak = c.flexInt(.streak)
        streakPyq = c.flexInt(.streakPyq)
        todos = c.flexArray(.todos, of: StudyTodo.self)
        activeTimer = try? c.decodeIfPresent(ActiveTimer.self, forKey: .activeTimer)
        history = (try? c.decodeIfPresent([String: Double].self, forKey: .history)) ?? [:]
        historyPyq = (try? c.decodeIfPresent([String: Double].self, forKey: .historyPyq)) ?? [:]
        weeklyHistory = c.flexArray(.weeklyHistory, of: WeeklyDayLog.self)
        weeklyStudyTotalHours = c.flexDouble(.weeklyStudyTotalHours)
        weeklyPyqTotalHours = c.flexDouble(.weeklyPyqTotalHours)
        weeklyGrandTotalHours = c.flexDouble(.weeklyGrandTotalHours)
        lastUpdated = try? c.decodeIfPresent(String.self, forKey: .lastUpdated)
    }

    // ── Derived ─────────────────────────────────────────────────────────────

    var todayStudyHoursDisplay: String { Format.hours(Double(todayStudySeconds) / 3600) }
    var todayPyqHoursDisplay: String { Format.hours(Double(todayPyqSeconds) / 3600) }

    var studyGoalHours: Int { dailyGoalSeconds / 3600 }
    var pyqGoalHours: Int { dailyPyqGoalSeconds / 3600 }

    var studyGoalProgress: Double {
        guard dailyGoalSeconds > 0 else { return 0 }
        return min(1, Double(todayStudySeconds) / Double(dailyGoalSeconds))
    }

    var pyqGoalProgress: Double {
        guard dailyPyqGoalSeconds > 0 else { return 0 }
        return min(1, Double(todayPyqSeconds) / Double(dailyPyqGoalSeconds))
    }
}

/// `{ success: true, state: { … } }`
struct StudyTimeResponse: Decodable, Sendable {
    let success: Bool
    let state: StudyTimeState?
}

/// The twelve POST actions the studytime endpoint accepts, one per case so a
/// typo cannot reach the wire (src/api/studytime.ts:143-224).
enum StudyAction: String, Sendable {
    case log
    case startTimer = "start_timer"
    case pauseTimer = "pause_timer"
    case resumeTimer = "resume_timer"
    case cancelTimer = "cancel_timer"
    case setGoal = "set_goal"
    case setPyqGoal = "set_pyq_goal"
    case resetToday = "reset_today"
    case addTodo = "add_todo"
    case toggleTodo = "toggle_todo"
    case deleteTodo = "delete_todo"
    case clearTodos = "clear_todos"
}
