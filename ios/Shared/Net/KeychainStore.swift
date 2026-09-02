import Foundation
import Security

/// Minimal keychain wrapper for the four credentials this app holds.
///
/// Items are stored as generic passwords in the shared access group when one is
/// available, so the widget extension can read the same values; otherwise they
/// land in the target's own keychain. `kSecAttrAccessibleAfterFirstUnlock` is
/// deliberate — background refresh and widget timelines run while the device is
/// locked, and `WhenUnlocked` would fail there.
enum KeychainStore {

    private static let service = "quest.srihari.rika"

    private static func baseQuery(_ key: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        if let group = AppConfig.appGroupID {
            query[kSecAttrAccessGroup as String] = group
        }
        return query
    }

    static func read(_ key: String) -> String? {
        var query = baseQuery(key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        // A missing access group (unsigned build, or a profile without the App
        // Groups capability) surfaces as -34018 / errSecMissingEntitlement.
        // Retry without the group rather than losing the credential entirely.
        if status == errSecMissingEntitlement, AppConfig.appGroupID != nil {
            return readWithoutGroup(key)
        }
        guard status == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8),
              !value.isEmpty
        else { return nil }
        return value
    }

    private static func readWithoutGroup(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8),
              !value.isEmpty
        else { return nil }
        return value
    }

    @discardableResult
    static func write(_ key: String, _ value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        // Upsert: try to update first, insert when nothing is there yet.
        let update: [String: Any] = [kSecValueData as String: data]
        let updateStatus = SecItemUpdate(baseQuery(key) as CFDictionary, update as CFDictionary)
        if updateStatus == errSecSuccess { return true }

        var insert = baseQuery(key)
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock

        var status = SecItemAdd(insert as CFDictionary, nil)
        if status == errSecMissingEntitlement || status == errSecNoAccessForItem {
            insert.removeValue(forKey: kSecAttrAccessGroup as String)
            status = SecItemAdd(insert as CFDictionary, nil)
        }
        return status == errSecSuccess
    }

    @discardableResult
    static func delete(_ key: String) -> Bool {
        SecItemDelete(baseQuery(key) as CFDictionary) == errSecSuccess
    }
}
