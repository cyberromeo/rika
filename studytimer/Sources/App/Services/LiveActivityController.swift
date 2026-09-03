import ActivityKit
import Foundation
import Observation

/// Owns the Live Activity on the Lock Screen and in the Dynamic Island.
///
/// The important property of this design is how *little* it does. Because the
/// widget renders the countdown with `Text(timerInterval:)`, the system animates
/// every tick on its own — so an Activity is only touched four times in a session's
/// life: request, pause, resume, end. No polling, no per-second pushes, and no risk
/// of running into ActivityKit's update budget.
///
/// Failures are recorded rather than swallowed. A Live Activity that silently never
/// appears is indistinguishable from a broken app, and the two most common causes —
/// the user disabling Live Activities for this app, and a sideloaded build whose
/// widget extension didn't get valid provisioning — are both invisible from inside
/// the app unless the error is surfaced.
@MainActor
@Observable
final class LiveActivityController {
    private var activity: Activity<FocusActivityAttributes>?

    /// Last `Activity.request` failure, verbatim, for the Settings diagnostics row.
    private(set) var lastError: String?
    /// Whether a request has ever succeeded this launch.
    private(set) var didStartSuccessfully = false

    /// False when the user has turned Live Activities off for this app in Settings.
    var areActivitiesEnabled: Bool {
        ActivityAuthorizationInfo().areActivitiesEnabled
    }

    /// Non-nil when something is stopping the Live Activity from appearing.
    var diagnostic: String? {
        if !areActivitiesEnabled {
            return "Live Activities are turned off for Lock In. Settings › Lock In › Live Activities."
        }
        return lastError
    }

    func start(session: Session, blockedCount: Int) async {
        guard areActivitiesEnabled else {
            lastError = nil  // not an error — a setting
            return
        }
        await end(session: session, immediately: true)

        let attributes = FocusActivityAttributes(
            sessionID: session.id.uuidString,
            mode: session.mode,
            plannedMinutes: Int(session.plannedDuration / 60)
        )
        let state = FocusActivityAttributes.ContentState.from(session, blockedCount: blockedCount)

        do {
            activity = try Activity.request(
                attributes: attributes,
                // staleDate a little past the end: if the app never gets to call
                // end(), the system dims the Activity instead of showing a countdown
                // that has silently stopped meaning anything.
                content: ActivityContent(
                    state: state,
                    staleDate: session.projectedEnd.addingTimeInterval(120)
                ),
                pushType: nil
            )
            lastError = nil
            didStartSuccessfully = true
        } catch {
            activity = nil
            lastError = "\(error)"
        }
    }

    func update(session: Session, blockedCount: Int) async {
        guard let activity else { return }
        let state = FocusActivityAttributes.ContentState.from(session, blockedCount: blockedCount)
        await activity.update(
            ActivityContent(state: state, staleDate: session.projectedEnd.addingTimeInterval(120))
        )
    }

    /// Reattaches to a running Activity after the app was relaunched. Without this
    /// a force-quit leaves an orphan on the Lock Screen that nothing can dismiss.
    func resync(with session: Session, blockedCount: Int) async {
        if activity == nil {
            activity = Activity<FocusActivityAttributes>.activities
                .first { $0.attributes.sessionID == session.id.uuidString }
        }
        if activity == nil {
            await start(session: session, blockedCount: blockedCount)
        } else {
            await update(session: session, blockedCount: blockedCount)
        }
        // Any Activity from an older session is stale by definition.
        for stray in Activity<FocusActivityAttributes>.activities
        where stray.attributes.sessionID != session.id.uuidString {
            await stray.end(nil, dismissalPolicy: .immediate)
        }
    }

    func end(session: Session, immediately: Bool = false) async {
        let final = FocusActivityAttributes.ContentState.from(session, blockedCount: 0)
        let content = ActivityContent(state: final, staleDate: nil)

        for live in Activity<FocusActivityAttributes>.activities {
            // Linger briefly on completion so the finished state is actually seen;
            // vanish instantly when the user ended it themselves, since they're
            // already looking at the app.
            await live.end(content, dismissalPolicy: immediately ? .immediate : .after(.now + 8))
        }
        activity = nil
    }
}
