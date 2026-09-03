import DeviceActivity
import Foundation

/// The safety valve.
///
/// The OS runs this extension on the schedule registered by `ShieldController`,
/// in a process the app doesn't own and can't kill. That's what makes it safe to
/// shield apps at all: if the main app crashes, is force-quit, or is never opened
/// again, `intervalDidEnd` still fires and still lifts the restrictions.
///
/// Class name must match `NSExtensionPrincipalClass` in `Support/Monitor-Info.plist`.
/// A mismatch fails silently — the extension simply never runs.
final class LockInActivityMonitor: DeviceActivityMonitor {

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        // Nothing to do: the app applies the shield at the moment the user hits
        // start, because waiting for this callback would leave a visible gap where
        // the blocked apps still open.
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        guard activity == .lockInSession else { return }

        // Mark the session finished before clearing, so if the app is launched later
        // it reconciles to "completed" rather than seeing a stale running session.
        if let session = SessionStore.load(), session.isActive {
            let outcome: SessionState = session.remaining() <= 0 ? .completed : .abandoned
            SessionStore.save(session.finished(as: outcome))
        }

        ShieldController.clear()
    }

    override func intervalWillEndWarning(for activity: DeviceActivityName) {
        super.intervalWillEndWarning(for: activity)
    }
}
