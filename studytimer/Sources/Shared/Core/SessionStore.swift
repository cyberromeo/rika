import Foundation

/// Persistence for the one session that matters: the live one.
///
/// The app owns it, but four extensions need to read it — the shield UI to show
/// remaining time, the shield action to decide what a button does, the monitor to
/// know what it's tearing down, the widget's intents to mutate it. Shared
/// `UserDefaults` in the app group is the only medium all six processes can touch,
/// and a single JSON blob avoids the partial-write problem you get from storing
/// each field separately.
public enum SessionStore {
    /// Posted (as a Darwin notification) whenever the blob changes, so a running
    /// process can react to a write made by a different one.
    public static let didChangeNotification = "quest.srihari.studytimer.session.didChange"

    public static func load() -> Session? {
        guard let data = AppGroup.defaults.data(forKey: StoreKey.currentSession) else { return nil }
        return try? JSONDecoder().decode(Session.self, from: data)
    }

    public static func save(_ session: Session?) {
        let defaults = AppGroup.defaults
        if let session, let data = try? JSONEncoder().encode(session) {
            defaults.set(data, forKey: StoreKey.currentSession)
        } else {
            defaults.removeObject(forKey: StoreKey.currentSession)
        }
        postChange()
    }

    /// The live session, or nil if the stored one has already finished.
    public static func activeSession() -> Session? {
        guard let session = load(), session.isActive else { return nil }
        return session
    }

    // MARK: Shield bookkeeping

    /// Whether a shield is currently applied. Tracked separately from the session
    /// because a crash can leave a shield behind with no session at all — and that
    /// orphan is exactly the state the app must detect and clear on launch.
    public static var shieldIsActive: Bool {
        get { AppGroup.defaults.bool(forKey: StoreKey.shieldActive) }
        set { AppGroup.defaults.set(newValue, forKey: StoreKey.shieldActive) }
    }

    /// True when apps are shielded but nothing is running to justify it.
    public static func hasOrphanedShield(at now: Date = Date()) -> Bool {
        guard shieldIsActive else { return false }
        guard let session = load() else { return true }
        if !session.isActive { return true }
        // Running but overdue — the monitor should have cleared it and didn't.
        return session.state == .running && session.remaining(at: now) <= 0
    }

    // MARK: Cross-process signalling

    private static func postChange() {
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(didChangeNotification as CFString),
            nil, nil, true
        )
    }
}
