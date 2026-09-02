import Foundation

/// Number formatting shared across the gym and study screens, ported from the
/// small helpers at the top of GymPage.tsx.
enum Format {

    private static let grouped: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f
    }()

    /// `formatNumber` — thousands separators.
    static func number(_ value: Int) -> String {
        grouped.string(from: NSNumber(value: value)) ?? String(value)
    }

    static func number(_ value: Double) -> String {
        number(Int(value.rounded()))
    }

    /// `formatVolume` — tonnes past 1000 kg, whole kilos below.
    static func volume(_ kg: Double) -> String {
        if kg >= 1000 { return String(format: "%.1ft", kg / 1000) }
        return "\(Int(kg.rounded()))kg"
    }

    /// Drops a trailing `.0` so "15.0 kg" reads as "15 kg".
    static func trim(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(format: "%g", value)
    }

    /// One decimal, for study hours.
    static func hours(_ value: Double) -> String {
        String(format: "%.1f", value)
    }
}
