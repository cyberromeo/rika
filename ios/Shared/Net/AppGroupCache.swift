import Foundation

/// Codable-on-disk cache, shared with the widget extension.
///
/// This is the native stand-in for the `localStorage` fallbacks the web app
/// keeps in every service (`rika_motra_data_v1`, `fmge_tracker_data_v1`,
/// `rika_studytime_data_v1`): every successful fetch is written here, and a
/// failed fetch falls back to the last good value rather than an empty screen.
///
/// It prefers the App Group container so widget timelines see exactly what the
/// app last wrote. When that container is unavailable — an unsigned build, or a
/// provisioning profile without the App Groups capability — it silently falls
/// back to the target's own Application Support directory. In that case the app
/// and the widgets each keep their own copy, which is why widget providers fetch
/// from the network too instead of trusting the cache alone.
enum AppGroupCache {

    enum Key: String, CaseIterable {
        case motra = "motra"
        case tracker = "tracker"
        case studytime = "studytime"
        case tasks = "tasks"
        case powerDaily = "power-daily"
        case powerWeekly = "power-weekly"
        case powerMonthly = "power-monthly"
        case aiUsage = "ai-usage"
        case focusTimer = "focus-timer"
    }

    /// Directory holding the cache files. Created on first use.
    private static let directory: URL? = {
        let fm = FileManager.default
        let base: URL?

        if let group = AppConfig.appGroupID,
           let container = fm.containerURL(forSecurityApplicationGroupIdentifier: group) {
            base = container.appendingPathComponent("Library/Caches", isDirectory: true)
        } else {
            base = try? fm.url(for: .applicationSupportDirectory,
                               in: .userDomainMask,
                               appropriateFor: nil,
                               create: true)
        }

        guard let base else { return nil }
        let dir = base.appendingPathComponent("RikaCache", isDirectory: true)
        try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    private static func fileURL(_ key: Key) -> URL? {
        directory?.appendingPathComponent("\(key.rawValue).json")
    }

    // ── Read / write ────────────────────────────────────────────────────────

    static func load<T: Decodable>(_ key: Key, as type: T.Type) -> T? {
        guard let url = fileURL(key),
              let data = try? Data(contentsOf: url)
        else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    @discardableResult
    static func save(_ key: Key, _ value: some Encodable) -> Bool {
        guard let url = fileURL(key),
              let data = try? JSONEncoder().encode(value)
        else { return false }
        do {
            try data.write(to: url, options: .atomic)
            return true
        } catch {
            return false
        }
    }

    /// When the cached copy was last written — used to label stale data.
    static func modifiedAt(_ key: Key) -> Date? {
        guard let url = fileURL(key) else { return nil }
        return (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?
            .contentModificationDate
    }

    static func clear() {
        for key in Key.allCases {
            if let url = fileURL(key) { try? FileManager.default.removeItem(at: url) }
        }
    }
}
