import Foundation
import Observation
import SwiftData

/// Reads and writes session history, and derives the numbers the Insights tab shows.
///
/// The streak rule mirrors `calculateStreak` in `api/studytime.js`: a day counts
/// only if it *met the goal*, not merely if something was studied. Keeping that
/// identical matters — a streak that disagrees with the web app's is worse than no
/// streak at all.
@MainActor
@Observable
final class HistoryStore {
    private let context: ModelContext

    /// Daily targets, matching the backend defaults (11h study, 2h PYQ).
    ///
    /// `nonisolated` because these are used as default arguments — which Swift
    /// evaluates outside the actor — and referencing a main-actor-isolated static
    /// from there is an error in Swift 6 language mode.
    nonisolated static let dailyStudyGoal: TimeInterval = 11 * 3600
    nonisolated static let dailyPyqGoal: TimeInterval = 2 * 3600

    init(context: ModelContext) {
        self.context = context
    }

    // MARK: Writes

    func record(_ session: Session, focusedSeconds: TimeInterval) {
        let record = SessionRecord(
            id: session.id,
            mode: session.mode,
            plannedDuration: session.plannedDuration,
            focusedDuration: focusedSeconds,
            startedAt: session.startedAt,
            endedAt: session.endedAt ?? Date(),
            state: session.state,
            anchor: StudyDay.anchor(for: session.endedAt ?? Date()),
            wasShielded: session.didShield
        )
        context.insert(record)
        try? context.save()
    }

    // MARK: Reads

    func sessions(on anchor: String) -> [SessionRecord] {
        let descriptor = FetchDescriptor<SessionRecord>(
            predicate: #Predicate { $0.anchor == anchor },
            sortBy: [SortDescriptor(\.endedAt, order: .reverse)]
        )
        return (try? context.fetch(descriptor)) ?? []
    }

    func recent(limit: Int = 40) -> [SessionRecord] {
        var descriptor = FetchDescriptor<SessionRecord>(
            sortBy: [SortDescriptor(\.endedAt, order: .reverse)]
        )
        descriptor.fetchLimit = limit
        return (try? context.fetch(descriptor)) ?? []
    }

    /// Focused seconds per mode for a given study day.
    func totals(on anchor: String) -> (study: TimeInterval, pyq: TimeInterval) {
        let all = sessions(on: anchor)
        return (
            study: all.filter { $0.mode == .study }.reduce(0) { $0 + $1.focusedDuration },
            pyq: all.filter { $0.mode == .pyq }.reduce(0) { $0 + $1.focusedDuration }
        )
    }

    /// Study seconds keyed by anchor, in one fetch. The streak and the weekly chart
    /// both walk many days at once, and a fetch per day turns into hundreds.
    private func studySecondsByAnchor() -> [String: TimeInterval] {
        let descriptor = FetchDescriptor<SessionRecord>()
        let all = (try? context.fetch(descriptor)) ?? []
        return all.reduce(into: [:]) { totals, record in
            guard record.mode == .study else { return }
            totals[record.anchor, default: 0] += record.focusedDuration
        }
    }

    struct DayTotal: Identifiable {
        var id: String { anchor }
        let anchor: String
        let label: String
        let study: TimeInterval
        let pyq: TimeInterval
        var total: TimeInterval { study + pyq }
    }

    func week(endingOn date: Date = Date()) -> [DayTotal] {
        StudyDay.recentAnchors(count: 7, from: date).map { anchor in
            let t = totals(on: anchor)
            return DayTotal(
                anchor: anchor,
                label: StudyDay.weekdayLabel(for: anchor),
                study: t.study,
                pyq: t.pyq
            )
        }
    }

    /// Consecutive study days meeting the daily goal, counting back from today.
    func streak(goal: TimeInterval = HistoryStore.dailyStudyGoal) -> Int {
        let totals = studySecondsByAnchor()
        // Newest first, so index 0 is today.
        let anchors = Array(StudyDay.recentAnchors(count: 365).reversed())

        var streak = 0
        for (index, anchor) in anchors.enumerated() {
            if (totals[anchor] ?? 0) >= goal {
                streak += 1
            } else if index > 0 {
                break
            }
            // A day still in progress shouldn't break the streak just because it's
            // only 3pm, so today can add to it but never terminate it.
        }
        return streak
    }
}
