import Foundation

/// Build-time configuration, read from the `RikaConfig` dictionary that
/// `Info.plist` populates from `Config/Base.xcconfig` + `Config/Secrets.xcconfig`.
///
/// Both the app and the widget extension carry the same dictionary, so this type
/// works identically in either target.
enum AppConfig {

    private static let values: [String: String] = {
        guard let dict = Bundle.main.object(forInfoDictionaryKey: "RikaConfig") as? [String: Any] else {
            return [:]
        }
        return dict.compactMapValues { $0 as? String }
    }()

    private static func string(_ key: String) -> String {
        // An unsubstituted xcconfig variable comes through as the literal
        // "$(NAME)", which is worse than empty because it would be sent to the
        // network. Treat it as absent.
        let raw = values[key]?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if raw.isEmpty || raw.hasPrefix("$(") { return "" }
        return raw
    }

    private static func url(_ key: String) -> URL? {
        let raw = string(key)
        return raw.isEmpty ? nil : URL(string: raw)
    }

    // ── Endpoints ───────────────────────────────────────────────────────────

    static var todoistBaseURL: URL? { url("TodoistBaseURL") }
    static var miraieBaseURL: URL? { url("MiraieBaseURL") }
    static var motraURL: URL? { url("MotraBaseURL") }
    static var medxBaseURL: URL? { url("MedxBaseURL") }

    /// Origin of the Vercel deployment hosting `/api/ai-usage`. Nil disables the
    /// AI usage card, which then renders its empty state.
    static var aiUsageURL: URL? {
        guard let origin = url("AIUsageBaseURL") else { return nil }
        return origin.appendingPathComponent("api/ai-usage")
    }

    // ── Container ───────────────────────────────────────────────────────────

    static var appGroupID: String? {
        let raw = string("AppGroupID")
        return raw.isEmpty ? nil : raw
    }

    // ── Seed values for the keychain ────────────────────────────────────────
    // Read once on first launch by AppSecrets, then never again.

    static var seedTodoistToken: String { string("TodoistAPIToken") }
    static var seedMiraieToken: String { string("MiraieAuthToken") }
    static var seedMiraieDeviceID: String { string("MiraieDeviceID") }
    static var seedStudytimePassword: String { string("StudytimePassword") }

    /// The medx account whose tracker rows this app reads and writes. Not a
    /// secret — it is a document id, and it is in the web bundle already
    /// (src/api/tracker.ts:1).
    static let medxUserID = "NpFFvozZSFWnCKdmutkISEGPf8o2"

    /// Background refresh task identifier, matching
    /// `BGTaskSchedulerPermittedIdentifiers` in Info.plist.
    static let refreshTaskID = "quest.srihari.rika.refresh"
}
