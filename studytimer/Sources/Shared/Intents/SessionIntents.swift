import ActivityKit
import AppIntents

/// Buttons on the Live Activity.
///
/// `LiveActivityIntent` runs in the **app's** process, not the widget's — the system
/// launches the app in the background to perform it. That's what makes it safe for
/// these to touch the shield and the shared session store directly. They're written
/// to be self-sufficient rather than to message a running `SessionEngine`, because
/// most of the time the app isn't running when the button is tapped; the engine
/// picks up the change on its next `reconcile()`.
///
/// The file lives in `Shared/` because both targets need it: the widget to reference
/// the intent in `Button(intent:)`, the app to execute it.

struct PauseSessionIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Pause session"
    static var description = IntentDescription("Pauses the running focus session.")
    /// Keep it out of Shortcuts and Spotlight — it only makes sense in context.
    static var isDiscoverable: Bool = false

    func perform() async throws -> some IntentResult {
        guard let session = SessionStore.load(), session.state == .running else {
            return .result()
        }
        let paused = session.paused()
        SessionStore.save(paused)
        await LiveActivityBridge.update(paused)
        return .result()
    }
}

struct ResumeSessionIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Resume session"
    static var description = IntentDescription("Resumes the paused focus session.")
    static var isDiscoverable: Bool = false

    func perform() async throws -> some IntentResult {
        guard let session = SessionStore.load(), session.state == .paused else {
            return .result()
        }
        let resumed = session.resumed()
        SessionStore.save(resumed)
        // The end time moved, so the OS-level shield teardown has to move with it.
        ShieldController.rescheduleTeardown(for: resumed)
        await LiveActivityBridge.update(resumed)
        return .result()
    }
}

/// Ending from the Lock Screen deliberately does *not* offer the one-tap escape the
/// hold button guards against. Outside the grace window it opens the app instead, so
/// bailing still costs the same deliberate hold — a Dynamic Island shortcut past the
/// friction would make the friction decorative.
struct EndSessionIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "End session"
    static var description = IntentDescription("Ends the focus session.")
    static var isDiscoverable: Bool = false

    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        guard let session = SessionStore.load(), session.isActive else { return .result() }

        // Inside the grace window there's no penalty to enforce, so finish it here
        // and save the user a round trip through the app.
        if !LockInPolicy.requiresHold(for: session) {
            let ended = session.finished(as: .abandoned)
            SessionStore.save(ended)
            ShieldController.clear()
            await LiveActivityBridge.end(ended)
        }
        return .result()
    }
}

/// Minimal ActivityKit access for the intents. The app has a fuller
/// `LiveActivityController`, but that lives in the app target and these must work
/// from shared code.
enum LiveActivityBridge {
    static func update(_ session: Session) async {
        let state = FocusActivityAttributes.ContentState.from(
            session,
            blockedCount: BlocklistStore.count()
        )
        for activity in Activity<FocusActivityAttributes>.activities
        where activity.attributes.sessionID == session.id.uuidString {
            await activity.update(
                ActivityContent(state: state, staleDate: session.projectedEnd.addingTimeInterval(120))
            )
        }
    }

    static func end(_ session: Session) async {
        let state = FocusActivityAttributes.ContentState.from(session, blockedCount: 0)
        for activity in Activity<FocusActivityAttributes>.activities {
            await activity.end(
                ActivityContent(state: state, staleDate: nil),
                dismissalPolicy: .immediate
            )
        }
    }
}
