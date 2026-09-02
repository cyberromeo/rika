import Foundation

/// Identifiers shared by the app and all five extensions.
///
/// These strings appear in `Support/StudyTimer.entitlements` and in the
/// `ManagedSettingsStore` name. Changing one without the others produces a build
/// that runs but silently can't see its own session state, so they live here and
/// nowhere else.
public enum AppGroup {
    /// Must match `com.apple.security.application-groups` in the entitlements file.
    public static let identifier = "group.quest.srihari.studytimer"

    /// Shared defaults — the only channel between the app process and the
    /// extension processes. Extensions have no access to the app's own container.
    public static var defaults: UserDefaults {
        UserDefaults(suiteName: identifier) ?? .standard
    }
}

/// Keys inside the shared defaults. Namespaced so a stray `UserDefaults` write
/// elsewhere can't collide.
public enum StoreKey {
    public static let currentSession = "lockin.session.current"
    public static let blocklist = "lockin.blocklist.selection"
    public static let bailCount = "lockin.policy.bails"
    public static let lastBailDate = "lockin.policy.lastBail"
    public static let shieldActive = "lockin.shield.active"
    public static let syncQueue = "lockin.sync.queue"
    public static let localNotificationsEnabled = "lockin.notifications.enabled"
}
