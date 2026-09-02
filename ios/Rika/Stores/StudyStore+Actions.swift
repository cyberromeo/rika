import Foundation

/// Timer and todo actions. Local state moves first; the cloud call follows in a
/// detached task so the UI never waits on the network.
extension StudyStore {

    // ── Timer ───────────────────────────────────────────────────────────────

    /// Choose a preset. Cancels any cloud timer, matching `handleSelectPreset`
    /// (StudyPage.tsx:196).
    func selectPreset(minutes: Int, mode: TimerMode? = nil) {
        Haptics.light()
        timer.arm(mode: mode, seconds: minutes * 60)
        if hasLiveCloudTimer {
            Task { await syncCancel() }
        }
    }

    func setMode(_ mode: TimerMode) {
        selectPreset(minutes: mode.defaultMinutes, mode: mode)
    }

    /// Start, pause or resume, deciding which the way `handleToggleTimer` does.
    func toggleTimer() async {
        Haptics.medium()

        if timer.isRunning {
            await timer.pause()
            Task { [service] in _ = try? await service.pauseTimer() }
            return
        }

        // Resume an existing paused cloud timer rather than starting a new one,
        // so the server keeps one continuous session.
        if let cloud = state?.activeTimer,
           !cloud.completed,
           !cloud.isRunning,
           (cloud.secondsRemaining ?? cloud.durationSeconds) > 0 {
            await timer.resume()
            Task { [service] in
                if let fresh = try? await service.resumeTimer() { await self.apply(fresh) }
            }
            return
        }

        await timer.start()
        let duration = timer.totalSeconds
        let mode = timer.mode
        Task { [service] in
            if let fresh = try? await service.startTimer(
                durationSeconds: duration,
                mode: mode,
                note: "\(mode.rawValue.uppercased()) Focus Session"
            ) {
                await self.apply(fresh)
            }
        }
    }

    func resetTimer() async {
        Haptics.light()
        await timer.reset()
        if hasLiveCloudTimer {
            await syncCancel()
        }
    }

    /// "Finish & Log": bank whatever has elapsed, then reset.
    func finishAndLog() async {
        let elapsed = timer.elapsedSeconds
        guard elapsed > 0 else { return }
        Haptics.medium()
        let mode = timer.mode
        await timer.reset()
        await logSession(seconds: elapsed, mode: mode, note: "Manual Finished Session")
        await syncCancel()
    }

    /// Fired by the engine when a run reaches zero.
    func handleCompletion(_ finished: FocusTimerSnapshot) async {
        await logSession(seconds: finished.totalSeconds, mode: finished.mode)
        await syncCancel()
    }

    var hasLiveCloudTimer: Bool {
        guard let cloud = state?.activeTimer else { return false }
        return !cloud.completed
    }

    // ── Cloud helpers ───────────────────────────────────────────────────────

    func logSession(seconds: Int, mode: TimerMode, note: String? = nil) async {
        let label = note ?? "\(mode.rawValue.uppercased()) Focus Session"

        // Credit the local totals immediately; the fetch that follows will
        // replace them with the server's own arithmetic.
        if var optimistic = state {
            if mode.loggedAs == .pyq {
                optimistic.todayPyqSeconds += seconds
                optimistic.todayPyqHours = Double(optimistic.todayPyqSeconds) / 3600
            } else {
                optimistic.todayStudySeconds += seconds
                optimistic.todayStudyHours = Double(optimistic.todayStudySeconds) / 3600
            }
            state = optimistic
        }

        if let fresh = try? await service.log(seconds: seconds, mode: mode, note: label) {
            await apply(fresh)
        }
    }

    func syncCancel() async {
        if let fresh = try? await service.cancelTimer() {
            await apply(fresh)
        }
    }

    func apply(_ fresh: StudyTimeState) async {
        state = fresh
    }

    // ── Todos ───────────────────────────────────────────────────────────────

    func addTodo(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        Haptics.light()
        if let fresh = try? await service.addTodo(trimmed) { await apply(fresh) }
    }

    func toggleTodo(_ id: String) async {
        Haptics.light()
        if var optimistic = state,
           let index = optimistic.todos.firstIndex(where: { $0.id == id }) {
            optimistic.todos[index].completed.toggle()
            state = optimistic
        }
        if let fresh = try? await service.toggleTodo(id: id) { await apply(fresh) }
    }

    func deleteTodo(_ id: String) async {
        Haptics.medium()
        if var optimistic = state {
            optimistic.todos.removeAll { $0.id == id }
            state = optimistic
        }
        if let fresh = try? await service.deleteTodo(id: id) { await apply(fresh) }
    }

    func clearCompletedTodos() async {
        Haptics.medium()
        if let fresh = try? await service.clearCompletedTodos() { await apply(fresh) }
    }
}
