import Foundation

/// Derived power values. Ported from the bottom half of powerStore.tsx.
extension PowerStore {

    // ── Lookups ─────────────────────────────────────────────────────────────

    func power(onDay key: String) -> Double { dailyByDay[key] ?? 0 }
    func power(inMonth key: String) -> Double { monthlyByMonth[key] ?? 0 }

    var todayPower: Double { power(onDay: DayKey.today) }
    var thisMonthPower: Double { power(inMonth: DayKey.monthString(from: Date())) }

    /// Monday through today, summed from the daily map — the API has no
    /// "current partial week" grain.
    var thisWeekPower: Double {
        let monday = DayKey.startOfWeekMonday(Date())
        return DayKey.days(from: monday, to: Date())
            .reduce(0) { $0 + power(onDay: DayKey.string(from: $1)) }
    }

    // ── Chart series ────────────────────────────────────────────────────────

    /// Seven days ending today, zero-filled so a missing day still occupies its
    /// slot rather than shifting the axis.
    var last7Days: [PowerPoint] {
        (0..<7).reversed().map { offset in
            let date = DayKey.adding(days: -offset, to: Date())
            return PowerPoint(
                label: DateDisplay.weekdayShort(date),
                value: power(onDay: DayKey.string(from: date))
            )
        }
    }

    /// The seven most recent weeks the API returned, labelled by week start.
    /// Unlike days these are not zero-filled: the API decides which weeks exist.
    var last7Weeks: [PowerPoint] {
        weeklyByWeekStart.keys.sorted().suffix(7).map { key in
            let parts = key.split(separator: "-")
            let label = parts.count == 3 ? "\(parts[2])/\(parts[1])" : key
            return PowerPoint(label: label, value: weeklyByWeekStart[key] ?? 0)
        }
    }

    var last7Months: [PowerPoint] {
        monthlyByMonth.keys.sorted().suffix(7).map { key in
            let label = DayKey.date(from: key + "-01").map(DateDisplay.monthAbbrev) ?? key
            return PowerPoint(label: label, value: monthlyByMonth[key] ?? 0)
        }
    }

    func series(for range: PowerChartRange) -> [PowerPoint] {
        switch range {
        case .days: return last7Days
        case .weeks: return last7Weeks
        case .months: return last7Months
        }
    }
}

/// The three-way segmented control in the power chart sheet.
enum PowerChartRange: String, CaseIterable, Identifiable, Sendable {
    case days, weeks, months

    var id: String { rawValue }

    var label: String {
        switch self {
        case .days: return "7 Days"
        case .weeks: return "7 Weeks"
        case .months: return "7 Months"
        }
    }
}
