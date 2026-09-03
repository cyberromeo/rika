import ActivityKit
import Foundation

/// Attributes for the Lock Screen / Dynamic Island Live Activity.
///
/// Shared verbatim between the app (which requests and updates the Activity) and
/// the widget extension (which renders it). Because the countdown is rendered with
/// `Text(timerInterval:)`, the `ContentState` carries **dates, not a remaining
/// count** — the system animates the ticking itself, so this app never pushes a
/// per-second update and never comes close to ActivityKit's update budget.
public struct FocusActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Start of the countdown window, already shifted by absorbed pause time.
        public var rangeStart: Date
        /// End of the countdown window.
        public var rangeEnd: Date
        /// Non-nil while paused — freezes the system-rendered timer in place.
        public var pausedAt: Date?
        /// Fraction complete at the moment of the update, for the static ring.
        public var progress: Double
        /// How many apps/categories are shielded, for the "N blocked" line. Tokens
        /// are opaque, so a count is genuinely all that can be shown.
        public var blockedCount: Int

        public init(
            rangeStart: Date,
            rangeEnd: Date,
            pausedAt: Date? = nil,
            progress: Double,
            blockedCount: Int
        ) {
            self.rangeStart = rangeStart
            self.rangeEnd = rangeEnd
            self.pausedAt = pausedAt
            self.progress = progress
            self.blockedCount = blockedCount
        }

        public var isPaused: Bool { pausedAt != nil }
        public var timerRange: ClosedRange<Date> {
            rangeStart...max(rangeEnd, rangeStart.addingTimeInterval(1))
        }
    }

    /// Fixed for the lifetime of the Activity.
    public var sessionID: String
    public var mode: SessionMode
    public var plannedMinutes: Int

    public init(sessionID: String, mode: SessionMode, plannedMinutes: Int) {
        self.sessionID = sessionID
        self.mode = mode
        self.plannedMinutes = plannedMinutes
    }
}

public extension FocusActivityAttributes.ContentState {
    /// Builds the content state straight from a session, keeping the mapping in one
    /// place so the app and any intent that updates the Activity can't disagree.
    static func from(_ session: Session, blockedCount: Int, at now: Date = Date()) -> Self {
        Self(
            rangeStart: session.timerRange.lowerBound,
            rangeEnd: session.timerRange.upperBound,
            pausedAt: session.pausedAt,
            progress: session.progress(at: now),
            blockedCount: blockedCount
        )
    }
}
