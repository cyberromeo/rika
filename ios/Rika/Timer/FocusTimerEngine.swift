import Foundation
import Observation

/// The focus timer's state machine.
///
/// Local state changes are instant and the cloud sync is fire-and-forget, which
/// is the behaviour the web app arrived at in commit 94a2f94 ("make focus timer
/// local-first (instant tick) with background cloud sync") — worth keeping,
/// because a 300 ms round trip between tapping Start and seeing the clock move
/// is very noticeable.
@MainActor
@Observable
final class FocusTimerEngine {

    /// Persisted state. Everything else is derived from it.
    private(set) var snapshot: FocusTimerSnapshot

    /// Bumped once a second while running, purely so views re-render.
    private(set) var tick: Date = .now

    /// Called when the run reaches zero — StudyStore logs it and clears the
    /// cloud timer.
    var onComplete: ((FocusTimerSnapshot) async -> Void)?

    private var ticker: Task<Void, Never>?

    init() {
        snapshot = AppGroupCache.load(.focusTimer, as: FocusTimerSnapshot.self)
            ?? .armed(mode: .study, seconds: TimerMode.study.defaultMinutes * 60)
    }

    // ── Derived ─────────────────────────────────────────────────────────────

    var remainingSeconds: Int { snapshot.remaining(now: tick) }
    var isRunning: Bool { snapshot.isRunning }
    var mode: TimerMode { snapshot.mode }
    var totalSeconds: Int { snapshot.totalSeconds }
    var progress: Double {
        guard totalSeconds > 0 else { return 0 }
        return 1 - Double(remainingSeconds) / Double(totalSeconds)
    }
    var clockText: String { DateDisplay.clock(remainingSeconds) }

    private var note: String { "\(snapshot.mode.rawValue.uppercased()) Focus Session" }

    // ── Actions ─────────────────────────────────────────────────────────────

    /// Pick a preset without starting it.
    func arm(mode: TimerMode? = nil, seconds: Int? = nil) {
        stopTicking()
        snapshot = .armed(
            mode: mode ?? snapshot.mode,
            seconds: seconds ?? snapshot.totalSeconds
        )
        persist()
        Task { await FocusActivityController.end() }
        FocusNotifications.cancel()
    }

    func start() async {
        snapshot = .started(mode: snapshot.mode, seconds: snapshot.totalSeconds)
        persist()
        startTicking()
        await FocusNotifications.requestAuthorizationIfNeeded()
        if let deadline = snapshot.deadline {
            await FocusNotifications.schedule(at: deadline, mode: snapshot.mode)
        }
        await FocusActivityController.start(snapshot, note: note)
    }

    func pause() async {
        guard snapshot.isRunning else { return }
        snapshot = snapshot.paused()
        persist()
        stopTicking()
        FocusNotifications.cancel()
        await FocusActivityController.update(snapshot)
    }

    func resume() async {
        guard !snapshot.isRunning, snapshot.remaining() > 0 else { return }
        snapshot = snapshot.resumed()
        persist()
        startTicking()
        if let deadline = snapshot.deadline {
            await FocusNotifications.schedule(at: deadline, mode: snapshot.mode)
        }
        if FocusActivityController.isAvailable {
            await FocusActivityController.update(snapshot)
        }
    }

    /// Back to the top of the current preset, nothing logged.
    func reset() async {
        snapshot = snapshot.reset()
        persist()
        stopTicking()
        FocusNotifications.cancel()
        await FocusActivityController.end()
    }

    /// Seconds worth logging if the user finishes early.
    var elapsedSeconds: Int { snapshot.elapsedSeconds(now: tick) }

    // ── Restoration ─────────────────────────────────────────────────────────

    /// Replaces local state wholesale — used by the cloud reconcile.
    func adopt(_ new: FocusTimerSnapshot) {
        snapshot = new
        persist()
        if new.isRunning { startTicking() } else { stopTicking() }
    }

    /// Called on foreground: a running timer may have passed its deadline while
    /// the app was away, in which case completion has to fire now.
    func resumeTickingIfNeeded() async {
        FocusActivityController.adoptExisting()
        guard snapshot.isRunning else { return }
        if snapshot.hasElapsed() {
            await complete()
        } else {
            startTicking()
        }
    }

    // ── Ticking ─────────────────────────────────────────────────────────────

    private func startTicking() {
        stopTicking()
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                self.tick = .now
                if self.snapshot.hasElapsed() {
                    await self.complete()
                    return
                }
                do {
                    try await Task.sleep(for: .seconds(1))
                } catch {
                    return
                }
            }
        }
    }

    private func stopTicking() {
        ticker?.cancel()
        ticker = nil
    }

    private func complete() async {
        stopTicking()
        let finished = snapshot
        // Land on zero so the readout does not sit at 00:01.
        snapshot.deadline = nil
        snapshot.remainingWhenPaused = 0
        snapshot.startedAt = nil
        snapshot.bankedSeconds = finished.totalSeconds
        persist()

        Haptics.heavy()
        FocusNotifications.cancel()
        await FocusActivityController.end()
        await onComplete?(finished)
    }

    private func persist() {
        AppGroupCache.save(.focusTimer, snapshot)
    }
}
