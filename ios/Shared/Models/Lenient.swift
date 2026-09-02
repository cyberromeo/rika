import Foundation

/// Decoding helpers for APIs that are loose about numeric types.
///
/// None of these endpoints are versioned or contract-tested, and two of them
/// already mix representations — Motra returns `overall_recovery` as `"97%"`
/// while every other percentage is a number. A strict `Decodable` turns that
/// kind of surprise into a whole blank screen; these turn it into one missing
/// value.
extension KeyedDecodingContainer {

    /// Decodes a `Double` from a JSON number, a numeric string, or a bool.
    func flexDouble(_ key: Key, default fallback: Double = 0) -> Double {
        if let d = try? decodeIfPresent(Double.self, forKey: key) { return d }
        if let i = try? decodeIfPresent(Int.self, forKey: key) { return Double(i) }
        if let s = try? decodeIfPresent(String.self, forKey: key) {
            return Double(s.trimmingCharacters(in: CharacterSet(charactersIn: "% "))) ?? fallback
        }
        return fallback
    }

    /// Decodes an `Int`, tolerating `"12"`, `12.0` and a trailing `%`.
    func flexInt(_ key: Key, default fallback: Int = 0) -> Int {
        if let i = try? decodeIfPresent(Int.self, forKey: key) { return i }
        if let d = try? decodeIfPresent(Double.self, forKey: key) { return Int(d.rounded()) }
        if let s = try? decodeIfPresent(String.self, forKey: key) {
            let cleaned = s.trimmingCharacters(in: CharacterSet(charactersIn: "% "))
            if let i = Int(cleaned) { return i }
            if let d = Double(cleaned) { return Int(d.rounded()) }
        }
        return fallback
    }

    func flexBool(_ key: Key, default fallback: Bool = false) -> Bool {
        if let b = try? decodeIfPresent(Bool.self, forKey: key) { return b }
        if let i = try? decodeIfPresent(Int.self, forKey: key) { return i != 0 }
        if let s = try? decodeIfPresent(String.self, forKey: key) {
            return ["true", "1", "yes"].contains(s.lowercased())
        }
        return fallback
    }

    func flexString(_ key: Key, default fallback: String = "") -> String {
        if let s = try? decodeIfPresent(String.self, forKey: key) { return s }
        if let i = try? decodeIfPresent(Int.self, forKey: key) { return String(i) }
        if let d = try? decodeIfPresent(Double.self, forKey: key) {
            return d == d.rounded() ? String(Int(d)) : String(d)
        }
        return fallback
    }

    /// An optional `Int` that stays nil when the key is absent or null — needed
    /// where nil is meaningful, as with Motra's `daysSinceLastUsed`.
    func flexOptionalInt(_ key: Key) -> Int? {
        if let i = try? decodeIfPresent(Int.self, forKey: key) { return i }
        if let d = try? decodeIfPresent(Double.self, forKey: key) { return Int(d.rounded()) }
        if let s = try? decodeIfPresent(String.self, forKey: key) { return Int(s) }
        return nil
    }

    func flexOptionalDouble(_ key: Key) -> Double? {
        if let d = try? decodeIfPresent(Double.self, forKey: key) { return d }
        if let i = try? decodeIfPresent(Int.self, forKey: key) { return Double(i) }
        if let s = try? decodeIfPresent(String.self, forKey: key) { return Double(s) }
        return nil
    }

    func flexArray<T: Decodable>(_ key: Key, of type: T.Type) -> [T] {
        (try? decodeIfPresent([T].self, forKey: key)) ?? []
    }

    func flexStrings(_ key: Key) -> [String] {
        (try? decodeIfPresent([String].self, forKey: key)) ?? []
    }
}

/// `"97%"` → `97`, clamped to 0…100. Ported from `parseRecoveryPercent`
/// (src/api/motra.ts:298).
func parseRecoveryPercent(_ value: String) -> Int {
    let digits = value.filter { $0.isNumber || $0 == "-" }
    guard let n = Int(digits) else { return 0 }
    return max(0, min(100, n))
}
