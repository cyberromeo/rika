import Foundation

/// Human-facing date strings. The patterns match the date-fns calls in the web
/// app one for one, so the two clients read identically.
enum DateDisplay {

    private static func localized(_ template: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = .autoupdatingCurrent
        f.setLocalizedDateFormatFromTemplate(template)
        return f
    }

    private static let fmtDayMonth = localized("d MMM")          // "8 Jul"
    private static let fmtMonthDay = localized("MMM d")          // "Jul 8"
    private static let fmtMonthYear = localized("MMMM yyyy")     // "July 2026"
    private static let fmtWeekdayLong = localized("EEEE MMM d")  // "Monday, Jul 8"
    private static let fmtWeekdayShort = localized("EEE")        // "Mon"
    private static let fmtSessionDate = localized("EEE d MMM yyyy")
    private static let fmtMonthAbbrev = localized("MMM")          // "Jul"

    /// date-fns `monthNames[month - 1]` — power chart month labels.
    static func monthAbbrev(_ date: Date) -> String { fmtMonthAbbrev.string(from: date) }

    /// date-fns `format(d, 'MMM d')`
    static func monthDay(_ date: Date) -> String { fmtMonthDay.string(from: date) }
    /// date-fns `format(d, 'd MMM')`
    static func dayMonth(_ date: Date) -> String { fmtDayMonth.string(from: date) }
    /// date-fns `format(currentMonth, 'MMMM yyyy')` — calendar header
    static func monthYear(_ date: Date) -> String { fmtMonthYear.string(from: date) }
    /// date-fns `format(selectedDate, 'EEEE, MMM d')` — day list header
    static func weekdayLong(_ date: Date) -> String { fmtWeekdayLong.string(from: date) }
    /// date-fns `format(d, 'EEE')` — chart axis labels
    static func weekdayShort(_ date: Date) -> String { fmtWeekdayShort.string(from: date) }
    /// date-fns `format(w.date, 'EEE, d MMM yyyy')` — gym session rows
    static func sessionDate(_ date: Date) -> String { fmtSessionDate.string(from: date) }

    /// Today / Tomorrow / Yesterday, else `MMM d`. Ported from `formatDueDate`
    /// in TaskItem.tsx:48.
    static func dueLabel(_ date: Date) -> String {
        if DayKey.isToday(date) { return "Today" }
        if DayKey.isTomorrow(date) { return "Tomorrow" }
        if DayKey.isYesterday(date) { return "Yesterday" }
        return monthDay(date)
    }

    /// "Today" / "Yesterday" / "3 days ago" / "2w ago" / "5mo ago" / "1y ago".
    /// Ported from `relativeDay` (GymPage.tsx:37); the thresholds are the ones
    /// the gym screens already use.
    static func relativeDay(_ date: Date, capitalized: Bool = true) -> String {
        let diff = DayKey.calendarDays(from: date, to: Date())
        let text: String
        switch diff {
        case ..<1: text = "today"
        case 1: text = "yesterday"
        case 2..<7: text = "\(diff) days ago"
        case 7..<30: text = "\(diff / 7)w ago"
        case 30..<365: text = "\(diff / 30)mo ago"
        default: text = "\(diff / 365)y ago"
        }
        guard capitalized, let first = text.first else { return text }
        return first.uppercased() + text.dropFirst()
    }

    /// Time-of-day greeting from HomePage.tsx:19.
    static func greeting(for date: Date = Date(), name: String = "Sri") -> String {
        let hour = Calendar.current.component(.hour, from: date)
        if hour < 12 { return "Good Morning, \(name)" }
        if hour < 17 { return "Good Afternoon, \(name)" }
        return "Good Evening, \(name)"
    }

    /// `mm:ss`, or `h:mm:ss` past an hour — the focus timer readout
    /// (`formatTime`, StudyPage.tsx:255).
    static func clock(_ seconds: Int) -> String {
        let s = max(0, seconds)
        let h = s / 3600
        let m = (s % 3600) / 60
        let sec = s % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, sec)
        }
        return String(format: "%02d:%02d", m, sec)
    }

    /// Coarse "resets in" label for the AI usage tiles (AiUsageWidget.tsx:108).
    static func compactDuration(_ seconds: Int) -> String {
        if seconds > 86_400 { return "\(seconds / 86_400)d" }
        if seconds > 3_600 { return "\(seconds / 3_600)h" }
        if seconds > 60 { return "\(seconds / 60)m" }
        return "\(seconds)s"
    }
}
