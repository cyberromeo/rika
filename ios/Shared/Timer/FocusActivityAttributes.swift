import Foundation
import ActivityKit

/// Live Activity payload for the focus timer.
///
/// The dynamic state carries a `deadline` rather than a seconds-remaining
/// count, so the Lock Screen and Dynamic Island can render a self-updating
/// `ProgressView(timerInterval:)` and `Text(timerInterval:)`. That is the whole
/// point of doing this natively: the countdown keeps running with no process of
/// ours alive, which the web app's `setInterval` cannot do.
struct FocusActivityAttributes: ActivityAttributes, Sendable {

    public struct ContentState: Codable, Hashable, Sendable {
        /// When the current run ends. Nil while paused.
        var deadline: Date?
        /// Seconds left at the moment it was paused, so a paused activity can
        /// still show a number.
        var remainingWhenPaused: Int?
        /// Total length of the run, for the progress denominator.
        var totalSeconds: Int
        var isRunning: Bool

        /// The window `ProgressView(timerInterval:)` counts across.
        var interval: ClosedRange<Date>? {
            guard let deadline else { return nil }
            let start = deadline.addingTimeInterval(-Double(totalSeconds))
            guard start < deadline else { return nil }
            return start...deadline
        }

        var remainingSeconds: Int {
            if let deadline {
                return max(0, Int(deadline.timeIntervalSinceNow.rounded()))
            }
            return remainingWhenPaused ?? 0
        }
    }

    /// Which kind of session this is — fixed for the life of the activity.
    var mode: TimerMode
    /// Free-text note the study API stores alongside the session.
    var note: String

    var title: String {
        switch mode {
        case .study: return "Study Focus"
        case .pyq: return "PYQ Focus"
        case .break10, .break20: return "Break"
        }
    }
}
