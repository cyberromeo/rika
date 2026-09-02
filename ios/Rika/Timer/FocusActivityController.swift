import Foundation
import ActivityKit

/// Starts, updates and ends the focus timer's Live Activity.
///
/// All of it is best-effort: Live Activities can be disabled by the user, and a
/// sideloaded build may not have the entitlement. Every call is a no-op in that
/// case rather than an error the timer has to handle.
@MainActor
enum FocusActivityController {

    private static var current: Activity<FocusActivityAttributes>?

    static var isAvailable: Bool {
        ActivityAuthorizationInfo().areActivitiesEnabled
    }

    static func start(_ snapshot: FocusTimerSnapshot, note: String) async {
        guard isAvailable else { return }
        await end()

        let attributes = FocusActivityAttributes(mode: snapshot.mode, note: note)
        let state = contentState(from: snapshot)

        do {
            current = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: snapshot.deadline),
                pushType: nil
            )
        } catch {
            current = nil
        }
    }

    static func update(_ snapshot: FocusTimerSnapshot) async {
        guard let activity = current else { return }
        await activity.update(
            .init(state: contentState(from: snapshot), staleDate: snapshot.deadline)
        )
    }

    static func end() async {
        guard let activity = current else { return }
        await activity.end(nil, dismissalPolicy: .immediate)
        current = nil
    }

    /// Adopts an activity that outlived the app process, so a relaunch does not
    /// leave an orphan on the Lock Screen.
    static func adoptExisting() {
        current = Activity<FocusActivityAttributes>.activities.first
    }

    private static func contentState(
        from snapshot: FocusTimerSnapshot
    ) -> FocusActivityAttributes.ContentState {
        .init(
            deadline: snapshot.deadline,
            remainingWhenPaused: snapshot.remainingWhenPaused,
            totalSeconds: snapshot.totalSeconds,
            isRunning: snapshot.isRunning
        )
    }
}
