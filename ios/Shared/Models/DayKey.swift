import Foundation

/// Date plumbing shared by every screen. The web app leans on date-fns for
/// this; the two things worth being careful about are both encoded here.
///
/// 1. `YYYY-MM-DD` strings are the app's canonical day key (Todoist due dates,
///    power maps, tracker history). They parse to **local midnight**, matching
///    date-fns `parseISO`, so `isToday` agrees with what the user sees.
/// 2. MirAIe wants `DDMMYYYY` / `MMYYYY` instead — see `Miraie` below. Mixing
///    the two up produces a silent empty chart rather than an error.
enum DayKey {

    /// Fixed-format formatters must be POSIX, or a non-Gregorian device
    /// calendar rewrites the digits.
    private static func fixed(_ format: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = .current
        f.dateFormat = format
        return f
    }

    private static let iso = fixed("yyyy-MM-dd")
    private static let isoMonth = fixed("yyyy-MM")

    // ── Canonical day key ───────────────────────────────────────────────────

    static func string(from date: Date) -> String { iso.string(from: date) }
    static func date(from key: String) -> Date? {
        key.isEmpty ? nil : iso.date(from: key)
    }

    static func monthString(from date: Date) -> String { isoMonth.string(from: date) }

    static var today: String { string(from: Date()) }

    // ── Calendar helpers ────────────────────────────────────────────────────

    private static var calendar: Calendar { .current }

    static func startOfDay(_ date: Date) -> Date { calendar.startOfDay(for: date) }

    static func isToday(_ date: Date) -> Bool { calendar.isDateInToday(date) }
    static func isTomorrow(_ date: Date) -> Bool { calendar.isDateInTomorrow(date) }
    static func isYesterday(_ date: Date) -> Bool { calendar.isDateInYesterday(date) }

    static func isSameDay(_ a: Date, _ b: Date) -> Bool {
        calendar.isDate(a, inSameDayAs: b)
    }

    static func isSameMonth(_ a: Date, _ b: Date) -> Bool {
        calendar.isDate(a, equalTo: b, toGranularity: .month)
    }

    static func adding(days: Int, to date: Date) -> Date {
        calendar.date(byAdding: .day, value: days, to: date) ?? date
    }

    static func adding(months: Int, to date: Date) -> Date {
        calendar.date(byAdding: .month, value: months, to: date) ?? date
    }

    static func startOfMonth(_ date: Date) -> Date {
        calendar.date(from: calendar.dateComponents([.year, .month], from: date)) ?? date
    }

    static func endOfMonth(_ date: Date) -> Date {
        let start = startOfMonth(date)
        let next = calendar.date(byAdding: .month, value: 1, to: start) ?? start
        return calendar.date(byAdding: .day, value: -1, to: next) ?? start
    }

    /// Start of week with an explicit first weekday, because the app needs both:
    /// the calendar grid is Monday-first while MirAIe's weekly grain requires
    /// Sunday-aligned bounds.
    ///
    /// `firstWeekday` uses Foundation's numbering — **1 = Sunday, 2 = Monday** —
    /// not date-fns's `weekStartsOn` (0 = Sunday). Prefer `startOfWeekSunday` /
    /// `startOfWeekMonday` below over passing the raw number.
    static func startOfWeek(_ date: Date, firstWeekday: Int) -> Date {
        var cal = calendar
        cal.firstWeekday = firstWeekday
        let comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return cal.date(from: comps) ?? cal.startOfDay(for: date)
    }

    /// date-fns `startOfWeek(d, { weekStartsOn: 0 })` — what MirAIe's weekly
    /// grain demands.
    static func startOfWeekSunday(_ date: Date) -> Date {
        startOfWeek(date, firstWeekday: 1)
    }

    /// date-fns `startOfWeek(d, { weekStartsOn: 1 })` — the calendar grid.
    static func startOfWeekMonday(_ date: Date) -> Date {
        startOfWeek(date, firstWeekday: 2)
    }

    /// date-fns `endOfWeek(d, { weekStartsOn: 1 })`.
    static func endOfWeekMonday(_ date: Date) -> Date {
        adding(days: 6, to: startOfWeekMonday(date))
    }

    /// Whole days between two dates, ignoring time — date-fns
    /// `differenceInCalendarDays(a, b)`.
    static func calendarDays(from earlier: Date, to later: Date) -> Int {
        calendar.dateComponents([.day], from: startOfDay(earlier), to: startOfDay(later)).day ?? 0
    }

    /// Every day in `start...end`, inclusive — date-fns `eachDayOfInterval`.
    static func days(from start: Date, to end: Date) -> [Date] {
        var result: [Date] = []
        var cursor = startOfDay(start)
        let last = startOfDay(end)
        while cursor <= last {
            result.append(cursor)
            guard let next = calendar.date(byAdding: .day, value: 1, to: cursor) else { break }
            cursor = next
        }
        return result
    }
}
