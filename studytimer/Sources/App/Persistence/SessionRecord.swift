import Foundation
import SwiftData

/// A finished session, kept locally.
///
/// Local storage is the source of truth for what the UI shows; medx is a mirror.
/// That ordering is deliberate — it's the same local-first pattern the web app
/// settled on (commit `94a2f94`), and it means a flaky network can never make the
/// timer feel slow or the history look empty.
@Model
final class SessionRecord {
    #Index<SessionRecord>([\.anchor], [\.endedAt])

    /// Named `sessionID` rather than `id` on purpose: `PersistentModel` already
    /// supplies an `id` (a `PersistentIdentifier`), and shadowing it breaks
    /// `Identifiable` conformance in ways that surface as confusing `ForEach` errors.
    var sessionID: UUID = UUID()
    /// Raw value of `SessionMode` — SwiftData stores primitives more predictably
    /// than enums across schema changes.
    var modeRaw: String = SessionMode.study.rawValue
    var plannedDuration: TimeInterval = 0
    /// Time actually focused, pauses excluded. This is what counts.
    var focusedDuration: TimeInterval = 0
    var startedAt: Date = Date()
    var endedAt: Date = Date()
    var stateRaw: String = SessionState.completed.rawValue
    /// Study-day key (`yyyy-MM-dd`, 8am IST rollover) this session belongs to.
    var anchor: String = ""
    /// Whether apps were shielded — useful for answering "do I actually focus
    /// better when I block things?"
    var wasShielded: Bool = false

    init(
        id: UUID,
        mode: SessionMode,
        plannedDuration: TimeInterval,
        focusedDuration: TimeInterval,
        startedAt: Date,
        endedAt: Date,
        state: SessionState,
        anchor: String,
        wasShielded: Bool
    ) {
        self.sessionID = id
        self.modeRaw = mode.rawValue
        self.plannedDuration = plannedDuration
        self.focusedDuration = focusedDuration
        self.startedAt = startedAt
        self.endedAt = endedAt
        self.stateRaw = state.rawValue
        self.anchor = anchor
        self.wasShielded = wasShielded
    }

    var mode: SessionMode { SessionMode(rawValue: modeRaw) ?? .study }
    var state: SessionState { SessionState(rawValue: stateRaw) ?? .completed }
    var wasCompleted: Bool { state == .completed }
}
