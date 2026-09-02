import Foundation

enum TimerMode: String, Codable, CaseIterable, Identifiable, Sendable {
    case study, pyq, break10, break20

    var id: String { rawValue }

    var label: String {
        switch self {
        case .study: return "Study Mode"
        case .pyq: return "PYQ Mode"
        case .break10, .break20: return "Break"
        }
    }

    var symbol: String {
        switch self {
        case .study: return "book.fill"
        case .pyq: return "target"
        case .break10, .break20: return "cup.and.saucer.fill"
        }
    }

    var tint: Color30 { self == .pyq ? .amber : (self == .study ? .blue : .green) }

    /// A break is logged against the study total, as the web app does when it
    /// maps `break10` to `study` before calling `log` (StudyPage.tsx:160).
    var loggedAs: TimerMode { self == .pyq ? .pyq : .study }

    /// Default duration in minutes for the mode's quick-launch button.
    var defaultMinutes: Int {
        switch self {
        case .study: return 60
        case .pyq: return 45
        case .break10: return 10
        case .break20: return 20
        }
    }
}

/// Small indirection so this model file does not import SwiftUI — the widget
/// and the Live Activity both need `TimerMode`, and one of them renders in a
/// different framework.
enum Color30: String, Codable, Sendable { case blue, amber, green }

struct ActiveTimer: Codable, Hashable, Sendable {
    var id: String = ""
    /// ISO-8601 instant the run began.
    var startTime: String = ""
    var durationSeconds: Int = 0
    var mode: TimerMode = .study
    var note: String?
    var isRunning: Bool = false
    var completed: Bool = false
    var secondsRemaining: Int?
    var elapsedSeconds: Int?

    enum CodingKeys: String, CodingKey {
        case id, startTime, durationSeconds, mode, note, isRunning, completed
        case secondsRemaining, elapsedSeconds
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = c.flexString(.id)
        startTime = c.flexString(.startTime)
        durationSeconds = c.flexInt(.durationSeconds)
        mode = TimerMode(rawValue: c.flexString(.mode, default: "study")) ?? .study
        note = try? c.decodeIfPresent(String.self, forKey: .note)
        isRunning = c.flexBool(.isRunning)
        completed = c.flexBool(.completed)
        secondsRemaining = c.flexOptionalInt(.secondsRemaining)
        elapsedSeconds = c.flexOptionalInt(.elapsedSeconds)
    }

    var startDate: Date? { ISODate.parse(startTime) }

    /// Seconds left according to wall time, for a timer that is running.
    func remaining(now: Date = Date()) -> Int {
        guard let start = startDate else { return secondsRemaining ?? durationSeconds }
        let elapsed = Int(now.timeIntervalSince(start))
        return max(0, durationSeconds - elapsed)
    }
}

struct StudyTodo: Codable, Hashable, Identifiable, Sendable {
    var id: String = ""
    var text: String = ""
    var completed: Bool = false
    var createdAt: String = ""

    enum CodingKeys: String, CodingKey { case id, text, completed, createdAt }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = c.flexString(.id)
        text = c.flexString(.text)
        completed = c.flexBool(.completed)
        createdAt = c.flexString(.createdAt)
    }
}

struct WeeklyDayLog: Codable, Hashable, Identifiable, Sendable {
    var date: String = ""
    var day: String = ""
    var studySeconds: Int = 0
    var studyHours: Double = 0
    var pyqSeconds: Int = 0
    var pyqHours: Double = 0
    var totalHours: Double = 0

    var id: String { date }

    enum CodingKeys: String, CodingKey {
        case date, day, studySeconds, studyHours, pyqSeconds, pyqHours, totalHours
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        date = c.flexString(.date)
        day = c.flexString(.day)
        studySeconds = c.flexInt(.studySeconds)
        studyHours = c.flexDouble(.studyHours)
        pyqSeconds = c.flexInt(.pyqSeconds)
        pyqHours = c.flexDouble(.pyqHours)
        totalHours = c.flexDouble(.totalHours)
    }
}

/// ISO-8601 parsing that tolerates both `…Z` and fractional seconds, because the
/// studytime API emits both shapes depending on which action wrote the record.
enum ISODate {
    private static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let plain = ISO8601DateFormatter()

    static func parse(_ string: String) -> Date? {
        guard !string.isEmpty else { return nil }
        return withFraction.date(from: string) ?? plain.date(from: string)
    }

    static func string(from date: Date) -> String { plain.string(from: date) }
}
