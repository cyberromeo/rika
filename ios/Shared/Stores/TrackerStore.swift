import Foundation
import Observation

/// FMGE syllabus tracker. Port of src/api/tracker.ts plus the optimistic
/// checkbox handling in StudyPage.tsx:175.
@MainActor
@Observable
final class TrackerStore {

    private(set) var data: TrackerData?
    private(set) var loading = true
    private(set) var errorMessage: String?

    private let service = TrackerService.shared

    /// The web app polls this every 5 seconds from three different components.
    /// Local edits are optimistic, so the poll only exists to pick up changes
    /// made on another device; 10 seconds while the screen is visible covers
    /// that without hammering the endpoint.
    static let pollInterval: Duration = .seconds(10)

    /// Suppresses the next poll's overwrite while a write is still in flight, so
    /// a checkbox does not visibly bounce back before the server catches up.
    private var inFlightWrites = 0

    func load() async {
        if data == nil, let cached = service.cached() {
            data = cached
            loading = false
        }

        do {
            let fresh = try await service.fetch()
            // A poll that lands mid-write would undo the optimistic value.
            if inFlightWrites == 0 {
                data = fresh
            }
            errorMessage = nil
        } catch is CancellationError {
        } catch {
            errorMessage = error.localizedDescription
            if data == nil { data = service.cached() }
        }
        loading = false
    }

    func pollLoop() async {
        while !Task.isCancelled {
            await load()
            do {
                try await Task.sleep(for: Self.pollInterval)
            } catch {
                return
            }
        }
    }

    // ── Writes ──────────────────────────────────────────────────────────────

    func toggle(subject: String, field: SubjectField) async {
        guard var current = data else { return }
        let newValue = !current.subject(subject)[field]

        var updated = current.subject(subject)
        updated[field] = newValue
        current.subjects[subject] = updated
        data = current
        AppGroupCache.save(.tracker, current)

        inFlightWrites += 1
        defer { inFlightWrites -= 1 }

        do {
            try await service.setSubject(subject, field: field, to: newValue)
        } catch {
            // Put it back: a checkbox that lies about having saved is worse than
            // one that visibly refuses.
            if var revert = data {
                var subjectData = revert.subject(subject)
                subjectData[field] = !newValue
                revert.subjects[subject] = subjectData
                data = revert
            }
            errorMessage = error.localizedDescription
        }
    }

    func toggle(grandTest gt: String) async {
        guard var current = data else { return }
        let newValue = !(current.gts[gt] ?? false)
        current.gts[gt] = newValue
        data = current
        AppGroupCache.save(.tracker, current)

        inFlightWrites += 1
        defer { inFlightWrites -= 1 }

        do {
            try await service.setGrandTest(gt, to: newValue)
        } catch {
            if var revert = data {
                revert.gts[gt] = !newValue
                data = revert
            }
            errorMessage = error.localizedDescription
        }
    }
}
