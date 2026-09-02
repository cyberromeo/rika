import Foundation

// ─── MirAIe date formats ────────────────────────────────────────────────────
//
// The power API does not speak ISO. Daily and weekly grains want `DDMMYYYY`,
// monthly wants `MMYYYY`, and the responses come back in the same shape. Every
// conversion the web app does in src/api/miraie.ts lives here, because a wrong
// order of day and month returns an empty array rather than an error — the
// chart just goes blank.

enum MiraieDate {

    private static func fixed(_ format: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = .current
        f.dateFormat = format
        return f
    }

    private static let ddMMyyyy = fixed("ddMMyyyy")
    private static let mmYYYY = fixed("MMyyyy")

    /// `dateToDDMMYYYY`
    static func ddmmyyyy(_ date: Date) -> String { ddMMyyyy.string(from: date) }
    /// `dateToMMYYYY`
    static func mmyyyy(_ date: Date) -> String { mmYYYY.string(from: date) }

    /// `ddmmyyyyToISO` — "08072026" → "2026-07-08"
    static func isoDay(fromDDMMYYYY s: String) -> String {
        guard s.count == 8 else { return s }
        let d = s.prefix(2)
        let m = s.dropFirst(2).prefix(2)
        let y = s.suffix(4)
        return "\(y)-\(m)-\(d)"
    }

    /// `mmyyyyToYYYYMM` — "072026" → "2026-07"
    static func isoMonth(fromMMYYYY s: String) -> String {
        guard s.count == 6 else { return s }
        let m = s.prefix(2)
        let y = s.suffix(4)
        return "\(y)-\(m)"
    }

    /// `isoToDDMMYYYY` — "2026-07-08" → "08072026"
    static func ddmmyyyy(fromISO s: String) -> String {
        let parts = s.split(separator: "-")
        guard parts.count == 3 else { return s }
        return "\(parts[2])\(parts[1])\(parts[0])"
    }
}

// ─── Wire types ─────────────────────────────────────────────────────────────

/// One row of the power response. The three grains differ only in which key
/// carries the period, so one type with three optional keys decodes all of them.
struct PowerEntry: Decodable, Sendable {
    let power: Double
    /// `DDMMYYYY` for daily, `DDMMYYYY` (week start) for weekly, `MMYYYY` for monthly.
    let period: String
    let grain: PowerGrain

    enum CodingKeys: String, CodingKey {
        case power, day, week, month
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        power = c.flexDouble(.power)

        if let day = try? c.decodeIfPresent(String.self, forKey: .day), let day {
            period = day
            grain = .daily
        } else if let week = try? c.decodeIfPresent(String.self, forKey: .week), let week {
            period = week
            grain = .weekly
        } else if let month = try? c.decodeIfPresent(String.self, forKey: .month), let month {
            period = month
            grain = .monthly
        } else {
            period = ""
            grain = .daily
        }
    }

    /// The map key this row contributes: `YYYY-MM-DD` for daily and weekly,
    /// `YYYY-MM` for monthly.
    var key: String {
        switch grain {
        case .daily, .weekly: return MiraieDate.isoDay(fromDDMMYYYY: period)
        case .monthly: return MiraieDate.isoMonth(fromMMYYYY: period)
        }
    }
}

enum PowerGrain: String, Sendable {
    case daily = "Daily"
    case weekly = "Weekly"
    case monthly = "Monthly"
}

/// A labelled bar in the power chart.
struct PowerPoint: Identifiable, Codable, Hashable, Sendable {
    var id: String { label + String(value) }
    let label: String
    let value: Double
}

/// Formats kWh the way the web app does (`formatKwh`): one decimal below 100,
/// none above.
func formatKwh(_ value: Double) -> String {
    value >= 100 ? String(Int(value.rounded())) : String(format: "%.1f", value)
}
