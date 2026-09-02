import Foundation

/// The four credentials the app needs, read from the keychain.
///
/// `seedFromBundleIfNeeded()` runs once at launch: any credential that the
/// keychain does not already hold is copied out of the build-time
/// `Secrets.xcconfig` values, after which the app reads only from the keychain.
/// That means a later build made without `Secrets.xcconfig` keeps working on a
/// device that has already run once, and a value edited in the keychain is not
/// clobbered by a stale xcconfig.
enum AppSecrets {

    enum Key {
        static let todoistToken = "todoist.token"
        static let miraieToken = "miraie.token"
        static let miraieDeviceID = "miraie.deviceID"
        static let studytimePassword = "studytime.password"
    }

    // ── Accessors ───────────────────────────────────────────────────────────

    static var todoistToken: String? { KeychainStore.read(Key.todoistToken) }
    static var miraieToken: String? { KeychainStore.read(Key.miraieToken) }
    static var miraieDeviceID: String? { KeychainStore.read(Key.miraieDeviceID) }
    static var studytimePassword: String? { KeychainStore.read(Key.studytimePassword) }

    /// True when Todoist can be reached — the Tasks and Calendar tabs are the
    /// only ones that hard-fail without a credential.
    static var hasTodoist: Bool { todoistToken != nil }

    /// True when both halves of the MirAIe credential are present.
    static var hasMiraie: Bool { miraieToken != nil && miraieDeviceID != nil }

    // ── Seeding ─────────────────────────────────────────────────────────────

    static func seedFromBundleIfNeeded() {
        seed(Key.todoistToken, AppConfig.seedTodoistToken)
        seed(Key.miraieToken, AppConfig.seedMiraieToken)
        seed(Key.miraieDeviceID, AppConfig.seedMiraieDeviceID)
        seed(Key.studytimePassword, AppConfig.seedStudytimePassword)
    }

    private static func seed(_ key: String, _ value: String) {
        guard !value.isEmpty else { return }
        guard KeychainStore.read(key) == nil else { return }
        KeychainStore.write(key, value)
    }

    /// Overwrite a credential — used by the Settings screen.
    static func set(_ key: String, to value: String) {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            KeychainStore.delete(key)
        } else {
            KeychainStore.write(key, trimmed)
        }
    }
}
