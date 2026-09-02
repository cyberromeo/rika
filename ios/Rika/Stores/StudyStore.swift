import Foundation
import Observation

/// Study-time state plus the focus timer.
///
/// Lives in the app target rather than `Shared/` because it owns
/// `FocusTimerEngine`, which touches ActivityKit and UserNotifications.
@MainActor
@Observable
final class StudyStore {

    /// Settable across the store's extensions, not from views.
    internal var state: StudyTimeState?
    internal var errorMessage: String?
    private(set) var loading = true

    let timer = FocusTimerEngine()

    let service = StudyTimeService.shared
    private var hasReconciled = false

    /// The web app polls every 5s to keep its countdown honest. The countdown is
    /// now local and wall-clock accurate, so this poll only refreshes totals and
    /// the weekly chart.
    static let pollInterval: Duration = .seconds(10)

    init() {
        timer.onComplete = { [weak self] finished in
            await self?.handleCompletion(finished)
        }
    }

    // ── Loading ─────────────────────────────────────────────────────────────

    func load() async {
        if state == nil, let cached = service.cached() {
            state = cached
            loading = false
        }

        do {
            state = try await service.fetch()
            errorMessage = nil
        } catch is CancellationError {
        } catch {
            errorMessage = error.localizedDescription
            if state == nil { state = service.cached() }
        }
        loading = false

        await reconcileWithCloudOnce()
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

    // ── Cloud reconcile ─────────────────────────────────────────────────────

    /// Adopts a timer that was started on another device or before a relaunch.
    /// The four cases are the ones the web app handles at StudyPage.tsx:102-144;
    /// the difference is that a local deadline already survives backgrounding, so
    /// this runs once at load rather than on every resume.
    private func reconcileWithCloudOnce() async {
        guard !hasReconciled, let state else { return }
        hasReconciled = true

        guard let cloud = state.activeTimer else { return }

        // 1. A completed timer left behind in the cloud — clear it.
        if cloud.completed {
            await syncCancel()
            return
        }

        if cloud.isRunning {
            let remaining = cloud.remaining()
            if remaining == 0 {
                // 2. It finished while we were away: log the full duration, then
                //    clear the cloud timer.
                await logSession(seconds: cloud.durationSeconds, mode: cloud.mode)
                await syncCancel()
                timer.adopt(.armed(mode: cloud.mode, seconds: cloud.durationSeconds))
            } else {
                // 3. Still running: rebuild the deadline from the server's start
                //    time so both devices agree on when it ends.
                let restored = FocusTimerSnapshot(
                    mode: cloud.mode,
                    totalSeconds: cloud.durationSeconds,
                    deadline: Date().addingTimeInterval(Double(remaining)),
                    remainingWhenPaused: nil,
                    startedAt: cloud.startDate ?? Date(),
                    bankedSeconds: 0
                )
                timer.adopt(restored)
            }
        } else {
            // 4. Paused: restore what is left, stay stopped.
            let remaining = max(cloud.secondsRemaining ?? cloud.durationSeconds, 0)
            let total = cloud.durationSeconds > 0 ? cloud.durationSeconds : max(remaining, 1)
            var restored = FocusTimerSnapshot.armed(mode: cloud.mode, seconds: total)
            restored.remainingWhenPaused = remaining
            timer.adopt(restored)
        }
    }

    /// Re-check the timer when the app comes back to the foreground.
    func handleForeground() async {
        await timer.resumeTickingIfNeeded()
    }
}
