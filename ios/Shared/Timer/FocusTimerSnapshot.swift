import Foundation

/// Everything the focus timer needs to survive being suspended, killed, or
/// rebooted: a deadline instead of a countdown.
///
/// The web app stores `secondsRemaining` and decrements it from a `setInterval`
/// (StudyPage.tsx:147), so a backgrounded WebView simply stops counting and the
/// session silently under-reports. Persisting a `Date` means elapsed time is
/// always recomputed from the wall clock — the same rule already settled for the
/// medx exam runner.
struct FocusTimerSnapshot: Codable, Hashable, Sendable {
    var mode: TimerMode = .study
    /// Total length of the current run, in seconds.
    var totalSeconds: Int = 3600
    /// When the run ends. Non-nil only while running.
    var deadline: Date?
    /// Seconds left at the moment of pausing. Non-nil only while paused.
    var remainingWhenPaused: Int?
    /// When the current run last started or resumed — used to compute how much
    /// of the session to log.
    var startedAt: Date?
    /// Seconds already banked by earlier segments of this run, so a
    /// start-pause-resume-finish sequence logs the whole elapsed time.
    var bankedSeconds: Int = 0

    var isRunning: Bool { deadline != nil }

    /// Seconds left right now.
    func remaining(now: Date = Date()) -> Int {
        if let deadline {
            return max(0, Int(deadline.timeIntervalSince(now).rounded()))
        }
        return remainingWhenPaused ?? totalSeconds
    }

    /// Whether a running timer has already passed its deadline — true after the
    /// app comes back from being suspended through the end of a session.
    func hasElapsed(now: Date = Date()) -> Bool {
        guard let deadline else { return false }
        return now >= deadline
    }

    /// Total seconds actually spent in this run so far, banked plus the current
    /// segment. This is what gets logged, not `totalSeconds`.
    func elapsedSeconds(now: Date = Date()) -> Int {
        guard let startedAt else { return bankedSeconds }
        let segment = max(0, Int(now.timeIntervalSince(startedAt).rounded()))
        if let deadline {
            // Never credit more than the run was set up for.
            let cap = max(0, Int(deadline.timeIntervalSince(startedAt).rounded()))
            return bankedSeconds + min(segment, cap)
        }
        return bankedSeconds + segment
    }

    var progress: Double {
        guard totalSeconds > 0 else { return 0 }
        return 1 - Double(remaining()) / Double(totalSeconds)
    }

    // ── Transitions ─────────────────────────────────────────────────────────

    static func started(mode: TimerMode, seconds: Int, now: Date = Date()) -> FocusTimerSnapshot {
        FocusTimerSnapshot(
            mode: mode,
            totalSeconds: seconds,
            deadline: now.addingTimeInterval(Double(seconds)),
            remainingWhenPaused: nil,
            startedAt: now,
            bankedSeconds: 0
        )
    }

    /// A preset selected but not started yet.
    static func armed(mode: TimerMode, seconds: Int) -> FocusTimerSnapshot {
        FocusTimerSnapshot(
            mode: mode,
            totalSeconds: seconds,
            deadline: nil,
            remainingWhenPaused: seconds,
            startedAt: nil,
            bankedSeconds: 0
        )
    }

    func paused(now: Date = Date()) -> FocusTimerSnapshot {
        var copy = self
        copy.bankedSeconds = elapsedSeconds(now: now)
        copy.remainingWhenPaused = remaining(now: now)
        copy.deadline = nil
        copy.startedAt = nil
        return copy
    }

    func resumed(now: Date = Date()) -> FocusTimerSnapshot {
        let left = remainingWhenPaused ?? totalSeconds
        guard left > 0 else { return self }
        var copy = self
        copy.deadline = now.addingTimeInterval(Double(left))
        copy.startedAt = now
        copy.remainingWhenPaused = nil
        return copy
    }

    /// Back to the armed state for the same preset.
    func reset() -> FocusTimerSnapshot {
        .armed(mode: mode, seconds: totalSeconds)
    }
}
