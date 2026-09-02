import Foundation

// MARK: - Mode

/// The three session kinds, chosen to line up with the modes the medx backend
/// already understands (`study` / `pyq` / `break10`) so history stays consistent
/// with the web app.
public enum SessionMode: String, Codable, CaseIterable, Sendable {
    case study
    case pyq
    case rest

    public var title: String {
        switch self {
        case .study: "Study"
        case .pyq: "PYQ"
        case .rest: "Break"
        }
    }

    public var symbol: String {
        switch self {
        case .study: "book.closed.fill"
        case .pyq: "target"
        case .rest: "cup.and.saucer.fill"
        }
    }

    public var defaultMinutes: Int {
        switch self {
        case .study: 60
        case .pyq: 45
        case .rest: 10
        }
    }

    /// Duration chips offered for this mode.
    public var presets: [Int] {
        switch self {
        case .study: [25, 45, 60, 90]
        case .pyq: [20, 30, 45, 60]
        case .rest: [5, 10, 15, 20]
        }
    }

    /// A break isn't work, so it must never be shielded or logged as study time.
    public var isFocus: Bool { self != .rest }

    /// `mode` value the medx API expects. Breaks are never logged, so `rest`
    /// deliberately has no API representation.
    public var apiValue: String? {
        switch self {
        case .study: "study"
        case .pyq: "pyq"
        case .rest: nil
        }
    }
}

// MARK: - State

public enum SessionState: String, Codable, Sendable {
    case running
    case paused
    /// Ran to zero. Counts toward the day's total and the streak.
    case completed
    /// Ended early by the user. Logged for honesty, but breaks the streak.
    case abandoned
}

// MARK: - Session

/// A single focus session.
///
/// Every time value is derived from stored `Date`s rather than counted by a
/// ticking timer, which is what makes the countdown survive backgrounding, force
/// quit and reboot. Nothing in this type mutates on a schedule.
public struct Session: Codable, Identifiable, Sendable, Equatable {
    public let id: UUID
    public let mode: SessionMode
    /// What the user asked for, in seconds.
    public let plannedDuration: TimeInterval
    public let startedAt: Date

    /// Non-nil while paused; the instant the clock was frozen.
    public var pausedAt: Date?
    /// Pause time already absorbed by earlier pause/resume cycles.
    public var pausedTotal: TimeInterval
    public var endedAt: Date?
    public var state: SessionState

    /// Whether this session applied a shield, so teardown knows what to undo even
    /// if the blocklist changed mid-session.
    public var didShield: Bool

    public init(
        id: UUID = UUID(),
        mode: SessionMode,
        plannedDuration: TimeInterval,
        startedAt: Date = Date(),
        pausedAt: Date? = nil,
        pausedTotal: TimeInterval = 0,
        endedAt: Date? = nil,
        state: SessionState = .running,
        didShield: Bool = false
    ) {
        self.id = id
        self.mode = mode
        self.plannedDuration = plannedDuration
        self.startedAt = startedAt
        self.pausedAt = pausedAt
        self.pausedTotal = pausedTotal
        self.endedAt = endedAt
        self.state = state
        self.didShield = didShield
    }
}

// MARK: - Derived time

public extension Session {
    var isActive: Bool { state == .running || state == .paused }

    /// Wall-clock time spent actually focusing, excluding pauses.
    func elapsed(at now: Date = Date()) -> TimeInterval {
        let frozen = pausedAt ?? endedAt ?? now
        return max(0, frozen.timeIntervalSince(startedAt) - pausedTotal)
    }

    func remaining(at now: Date = Date()) -> TimeInterval {
        max(0, plannedDuration - elapsed(at: now))
    }

    /// 0...1, clamped.
    func progress(at now: Date = Date()) -> Double {
        guard plannedDuration > 0 else { return 1 }
        return min(1, max(0, elapsed(at: now) / plannedDuration))
    }

    func hasExpired(at now: Date = Date()) -> Bool {
        state == .running && remaining(at: now) <= 0
    }

    /// The moment a still-running session will hit zero. Shifts forward with each
    /// pause, which is exactly what the notification and the monitoring schedule
    /// need to be re-armed against.
    var projectedEnd: Date {
        startedAt.addingTimeInterval(pausedTotal + plannedDuration)
    }

    /// Range handed to `Text(timerInterval:pauseTime:countsDown:)` so the system —
    /// not this app — animates the Live Activity countdown. While paused the range
    /// is intentionally stale; `pauseTime` freezes the rendering at the right value
    /// and resuming shifts the range forward by the pause it absorbed.
    var timerRange: ClosedRange<Date> {
        let anchor = startedAt.addingTimeInterval(pausedTotal)
        return anchor...anchor.addingTimeInterval(max(1, plannedDuration))
    }
}

// MARK: - Transitions

public extension Session {
    func paused(at now: Date = Date()) -> Session {
        guard state == .running else { return self }
        var copy = self
        copy.pausedAt = now
        copy.state = .paused
        return copy
    }

    func resumed(at now: Date = Date()) -> Session {
        guard state == .paused, let pausedAt else { return self }
        var copy = self
        copy.pausedTotal += max(0, now.timeIntervalSince(pausedAt))
        copy.pausedAt = nil
        copy.state = .running
        return copy
    }

    func finished(as outcome: SessionState, at now: Date = Date()) -> Session {
        var copy = self
        // Resolve an open pause first, so `elapsed` on the finished session doesn't
        // keep counting time the user spent paused.
        if let pausedAt {
            copy.pausedTotal += max(0, now.timeIntervalSince(pausedAt))
            copy.pausedAt = nil
        }
        // A completed session ends at the instant it was *due* to end, not whenever
        // the app happened to notice — otherwise reopening the app hours later would
        // credit hours of extra study time.
        copy.endedAt = outcome == .completed ? projectedEnd : now
        copy.state = outcome
        return copy
    }
}
