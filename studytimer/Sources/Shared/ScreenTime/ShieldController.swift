import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

public extension DeviceActivityName {
    /// One monitored activity, reused for every session.
    static let lockInSession = Self("lockInSession")
}

/// The single owner of shield state.
///
/// Everything about this type is shaped by one failure mode: **if the app is the
/// only thing that can lift a shield, a crash mid-session locks the user out of
/// their own phone.** So applying a shield always registers an OS-level teardown
/// alongside it, and there are three independent paths that clear it — the
/// monitor extension's `intervalDidEnd`, the app on session end, and an
/// orphan sweep on launch.
public enum ShieldController {

    private static var store: ManagedSettingsStore { ManagedSettingsStore(named: .lockIn) }
    private static var center: DeviceActivityCenter { DeviceActivityCenter() }

    // MARK: - Apply

    /// Shields the stored blocklist for the duration of `session`.
    ///
    /// Returns false when there's nothing to shield or the session is too short to
    /// be covered by the OS safety valve — never silently half-applies.
    @discardableResult
    public static func apply(for session: Session) -> Bool {
        let selection = BlocklistStore.load()
        guard BlocklistStore.count(in: selection) > 0, session.mode.isFocus else { return false }

        let store = store
        store.shield.applications = selection.applicationTokens.isEmpty
            ? nil : selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens.isEmpty
            ? nil : .specific(selection.categoryTokens)
        store.shield.webDomains = selection.webDomainTokens.isEmpty
            ? nil : selection.webDomainTokens

        // Closes the two obvious escape hatches: deleting the app, and winding the
        // clock forward past the session's end. Both are undone by clear().
        store.application.denyAppRemoval = true
        store.dateAndTime.requireAutomaticDateAndTime = true

        SessionStore.shieldIsActive = true
        scheduleTeardown(for: session)
        return true
    }

    /// Re-arms the OS teardown after a pause/resume shifted the end time.
    public static func rescheduleTeardown(for session: Session) {
        guard SessionStore.shieldIsActive else { return }
        scheduleTeardown(for: session)
    }

    // MARK: - Clear

    /// Lifts every restriction this app applied. Safe to call repeatedly, and safe
    /// to call from an extension — which is the whole point.
    public static func clear() {
        store.clearAllSettings()
        center.stopMonitoring([.lockInSession])
        SessionStore.shieldIsActive = false
    }

    /// Called on launch and on foreground. Catches the case where the app died
    /// mid-session and the monitor never fired, so restrictions outlived the
    /// session that justified them.
    public static func clearIfOrphaned(at now: Date = Date()) {
        guard SessionStore.hasOrphanedShield(at: now) else { return }
        clear()
    }

    // MARK: - OS-level teardown

    /// Registers a `DeviceActivitySchedule` whose end fires
    /// `LockInActivityMonitor.intervalDidEnd`, which clears the shield in a process
    /// the app doesn't control — so it happens even if the app is force-quit.
    ///
    /// Two framework constraints shape this: schedules are expressed as
    /// *time-of-day* `DateComponents` rather than absolute dates, and the interval
    /// has a ~15 minute minimum. Sessions shorter than that get their window padded
    /// out to 15 minutes; they still end on time in-app, they just fall back to the
    /// app-side clear rather than the OS one.
    private static func scheduleTeardown(for session: Session) {
        let end = session.projectedEnd.addingTimeInterval(LockInPolicy.shieldTeardownGrace)
        let minimumEnd = Date().addingTimeInterval(LockInPolicy.minimumShieldableDuration)
        let effectiveEnd = max(end, minimumEnd)

        let calendar = Calendar.current
        // Start a minute in the past so the interval already contains "now" and
        // monitoring begins immediately instead of waiting for the next occurrence.
        let start = Date().addingTimeInterval(-60)

        let schedule = DeviceActivitySchedule(
            intervalStart: calendar.dateComponents([.hour, .minute], from: start),
            intervalEnd: calendar.dateComponents([.hour, .minute], from: effectiveEnd),
            repeats: false
        )

        center.stopMonitoring([.lockInSession])
        do {
            try center.startMonitoring(.lockInSession, during: schedule)
        } catch {
            // Losing the safety valve is worse than losing the shield: without it a
            // crash could leave apps blocked indefinitely. Fail closed.
            clear()
        }
    }
}
