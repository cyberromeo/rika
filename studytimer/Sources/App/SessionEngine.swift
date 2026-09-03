import Foundation
import Observation
import SwiftUI

/// The one object that owns a session's lifecycle.
///
/// Deliberately not a ticking clock: no `Timer` drives state here. The engine
/// writes dates, and every consumer derives what it needs — the view via
/// `TimelineView`, the Live Activity via `Text(timerInterval:)`, the shield via
/// `SessionStore`. A single `Task` sleeps until the projected end to catch
/// completion; that's the only time-based machinery in the app.
@MainActor
@Observable
final class SessionEngine {

    // MARK: Configuration (idle state)

    var mode: SessionMode = .study {
        didSet {
            guard oldValue != mode else { return }
            selectedMinutes = mode.defaultMinutes
        }
    }
    var selectedMinutes: Int = SessionMode.study.defaultMinutes

    // MARK: Live state

    private(set) var session: Session?
    private(set) var lastOutcome: Outcome?
    /// Set when a start attempt couldn't shield, so the UI can explain rather than
    /// silently running an unshielded session the user thought was locked.
    private(set) var startWarning: String?

    struct Outcome: Identifiable, Equatable {
        let id = UUID()
        let mode: SessionMode
        let focusedSeconds: TimeInterval
        let wasCompleted: Bool
        let brokeStreak: Bool
    }

    private var completionTask: Task<Void, Never>?
    private let history: HistoryStore
    let liveActivity = LiveActivityController()
    private let notifications = NotificationScheduler()
    private let sync: SyncCoordinator

    var isRunning: Bool { session?.state == .running }
    var isPaused: Bool { session?.state == .paused }
    var isActive: Bool { session?.isActive ?? false }
    var blockedCount: Int { BlocklistStore.count() }

    init(history: HistoryStore, sync: SyncCoordinator) {
        self.history = history
        self.sync = sync
        restore()
    }

    // MARK: - Lifecycle

    /// Reattaches to whatever was happening before the app was killed, and cleans up
    /// after anything that finished while it was gone.
    func restore() {
        ShieldController.clearIfOrphaned()

        guard let stored = SessionStore.load() else { return }

        if stored.isActive, stored.hasExpired() {
            // Ran to zero while the app wasn't running.
            finish(stored, as: .completed)
            return
        }
        if !stored.isActive {
            SessionStore.save(nil)
            return
        }

        session = stored
        mode = stored.mode
        selectedMinutes = Int(stored.plannedDuration / 60)
        armCompletion()
        Task { await liveActivity.resync(with: stored, blockedCount: blockedCount) }
    }

    /// Called when the app comes back to the foreground. Cheap, and the only thing
    /// standing between the user and a stale screen.
    func reconcile() {
        ShieldController.clearIfOrphaned()

        guard let current = SessionStore.load() else {
            if session != nil { session = nil }
            return
        }

        if current.isActive, current.hasExpired() {
            finish(current, as: .completed)
        } else if !current.isActive {
            session = nil
            Task { await liveActivity.end(session: current) }
        } else if current != session {
            // A Live Activity intent mutated it from outside the app.
            session = current
            armCompletion()
        }
    }

    // MARK: - Commands

    func start() {
        guard session == nil else { return }
        startWarning = nil

        let duration = TimeInterval(selectedMinutes * 60)
        var new = Session(mode: mode, plannedDuration: duration)

        if mode.isFocus, blockedCount > 0 {
            if LockInPolicy.canShield(duration: duration) {
                new.didShield = ShieldController.apply(for: new)
            } else {
                startWarning = "Sessions under \(Int(LockInPolicy.minimumShieldableDuration / 60)) minutes run without blocking — iOS can't guarantee it would unblock them again."
            }
        }

        session = new
        SessionStore.save(new)
        armCompletion()

        notifications.scheduleCompletion(for: new)
        Task { await liveActivity.start(session: new, blockedCount: blockedCount) }
        sync.sessionStarted(new)
    }

    func pause() {
        guard let current = session, current.state == .running else { return }
        let updated = current.paused()
        apply(updated)
        notifications.cancelCompletion()
        sync.sessionPaused(updated)
    }

    func resume() {
        guard let current = session, current.state == .paused else { return }
        let updated = current.resumed()
        apply(updated)
        notifications.scheduleCompletion(for: updated)
        ShieldController.rescheduleTeardown(for: updated)
        sync.sessionResumed(updated)
    }

    /// Ends early. The friction that guards this lives in the view
    /// (`HoldToEndButton`) and the rules in `LockInPolicy`; by the time this is
    /// called the user has already paid the cost.
    func endEarly() {
        guard let current = session else { return }
        finish(current, as: .abandoned)
    }

    // MARK: - Internals

    private func apply(_ updated: Session) {
        session = updated
        SessionStore.save(updated)
        armCompletion()
        Task { await liveActivity.update(session: updated, blockedCount: blockedCount) }
    }

    private func finish(_ session: Session, as outcome: SessionState) {
        completionTask?.cancel()
        completionTask = nil

        let finished = session.finished(as: outcome)
        let focused = finished.elapsed()
        let consequence = outcome == .abandoned
            ? LockInPolicy.consequence(for: session)
            : BailConsequence.free

        ShieldController.clear()
        SessionStore.save(nil)
        self.session = nil

        // A completed session keeps its scheduled notification: it's timed to the
        // exact end instant, and cancelling it would mean silence whenever the app
        // happens to notice completion from the background. Only bailing early
        // invalidates the alert.
        if outcome == .abandoned {
            notifications.cancelCompletion()
            LockInPolicy.recordBail()
        }

        // A break is time off, not study time — never logged, never synced.
        if finished.mode.isFocus, focused > 0, consequence.logsPartialTime || outcome == .completed {
            history.record(finished, focusedSeconds: focused)
            sync.sessionFinished(finished, focusedSeconds: focused, wasCompleted: outcome == .completed)
        } else {
            sync.sessionDiscarded(finished)
        }

        lastOutcome = Outcome(
            mode: finished.mode,
            focusedSeconds: focused,
            wasCompleted: outcome == .completed,
            brokeStreak: consequence.breaksStreak && outcome == .abandoned
        )

        Task { await liveActivity.end(session: finished) }
    }

    /// Sleeps until the session is due to end, then completes it. Replaces a
    /// per-second timer entirely: one wake-up per session, exact to the second.
    private func armCompletion() {
        completionTask?.cancel()
        guard let current = session, current.state == .running else { return }

        let delay = current.remaining()
        completionTask = Task { [weak self] in
            if delay > 0 {
                try? await Task.sleep(for: .seconds(delay))
            }
            guard !Task.isCancelled else { return }
            guard let self, let live = self.session, live.id == current.id else { return }
            self.finish(live, as: .completed)
        }
    }

    func dismissOutcome() { lastOutcome = nil }
    func dismissWarning() { startWarning = nil }
}
