import Foundation
import Observation

/// Mirrors local sessions to medx, without ever letting the network affect the UI.
///
/// Local-first means the timer and history never wait on a request, so every remote
/// call is fire-and-forget with a durable queue behind it. A failed call is
/// persisted and retried on the next foreground rather than surfaced as an error —
/// the user cares that their session happened, not that a mirror lagged.
@MainActor
@Observable
final class SyncCoordinator {

    /// One queued remote call. Persisted, so a force-quit doesn't lose it.
    enum Operation: Codable, Equatable {
        case startTimer(durationSeconds: Int, mode: String, note: String)
        case pauseTimer
        case resumeTimer
        case cancelTimer
        case log(seconds: Int, mode: String, note: String)
    }

    private(set) var remote: MedxClient.RemoteState?
    private(set) var isFlushing = false
    private(set) var lastError: String?

    private let client: MedxClient?
    private var queue: [Operation] = []

    var isConfigured: Bool { client != nil }
    /// Pending items, surfaced in Settings so a silently stuck queue is visible.
    var pendingCount: Int { queue.count }

    init() {
        client = MedxClient.Config.fromBundle().map(MedxClient.init(config:))
        queue = Self.loadQueue()
    }

    // MARK: - Session hooks

    func sessionStarted(_ session: Session) {
        guard let mode = session.mode.apiValue else { return }
        enqueue(.startTimer(
            durationSeconds: Int(session.plannedDuration),
            mode: mode,
            note: "\(session.mode.title) · Lock In (iOS)"
        ))
    }

    func sessionPaused(_ session: Session) {
        guard session.mode.apiValue != nil else { return }
        enqueue(.pauseTimer)
    }

    func sessionResumed(_ session: Session) {
        guard session.mode.apiValue != nil else { return }
        enqueue(.resumeTimer)
    }

    /// Completion sends `cancel_timer` **only** — the backend logs the finished
    /// duration itself when it evaluates the expired timer. An abandoned session is
    /// the one case that logs explicitly, because the server would otherwise credit
    /// the full planned duration instead of the part actually worked.
    func sessionFinished(_ session: Session, focusedSeconds: TimeInterval, wasCompleted: Bool) {
        guard let mode = session.mode.apiValue else { return }

        if wasCompleted {
            enqueue(.cancelTimer)
        } else {
            enqueue(.cancelTimer)
            let seconds = Int(focusedSeconds)
            if seconds > 0 {
                enqueue(.log(seconds: seconds, mode: mode, note: "Ended early · Lock In (iOS)"))
            }
        }
    }

    /// A session that shouldn't count at all (a break, or zero focused time) still
    /// needs the remote timer cleared.
    func sessionDiscarded(_ session: Session) {
        guard session.mode.apiValue != nil else { return }
        enqueue(.cancelTimer)
    }

    // MARK: - Queue

    private func enqueue(_ operation: Operation) {
        queue.append(operation)
        persistQueue()
        Task { await flush() }
    }

    func flush() async {
        guard let client, !isFlushing, !queue.isEmpty else { return }
        isFlushing = true
        defer { isFlushing = false }

        // Strictly in order: pause-then-resume arriving reversed would leave the
        // remote timer in the wrong state.
        while let operation = queue.first {
            do {
                try await perform(operation, with: client)
                queue.removeFirst()
                persistQueue()
                lastError = nil
            } catch {
                lastError = error.localizedDescription
                return
            }
        }
    }

    func refreshRemoteState() async {
        guard let client else { return }
        do {
            remote = try await client.fetchState()
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    private func perform(_ operation: Operation, with client: MedxClient) async throws {
        switch operation {
        case let .startTimer(duration, mode, note):
            try await client.startTimer(durationSeconds: duration, mode: mode, note: note)
        case .pauseTimer:
            try await client.pauseTimer()
        case .resumeTimer:
            try await client.resumeTimer()
        case .cancelTimer:
            try await client.cancelTimer()
        case let .log(seconds, mode, note):
            try await client.log(seconds: seconds, mode: mode, note: note)
        }
    }

    private func persistQueue() {
        guard let data = try? JSONEncoder().encode(queue) else { return }
        AppGroup.defaults.set(data, forKey: StoreKey.syncQueue)
    }

    private static func loadQueue() -> [Operation] {
        guard let data = AppGroup.defaults.data(forKey: StoreKey.syncQueue),
              let queue = try? JSONDecoder().decode([Operation].self, from: data)
        else { return [] }
        return queue
    }
}
