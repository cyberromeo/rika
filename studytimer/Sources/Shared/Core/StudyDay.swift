import Foundation

/// The day-bucketing rule that decides which calendar day a session counts toward.
///
/// This is **not** midnight local time. The medx backend anchors the study day to
/// 8am IST — a session finished at 2am belongs to the previous day, because that's
/// how a night of studying actually feels. Mirrored from `getStudyDayAnchor` in
/// `api/studytime.js`; if that rule ever changes, both sides have to move together
/// or the iOS streak will disagree with the web app's.
public enum StudyDay {
    /// Hour (in IST) at which one study day rolls over into the next.
    public static let rolloverHour = 8

    public static let timeZone = TimeZone(identifier: "Asia/Kolkata") ?? TimeZone(secondsFromGMT: 19800)!

    private static var calendar: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        return cal
    }

    /// `yyyy-MM-dd` key for the study day containing `date`.
    public static func anchor(for date: Date = Date()) -> String {
        var components = calendar.dateComponents([.year, .month, .day, .hour], from: date)
        guard let hour = components.hour else { return format(date) }

        if hour < rolloverHour {
            // Before the rollover, so this still belongs to yesterday.
            components.hour = 12  // midday avoids DST/edge weirdness when re-resolving
            if let resolved = calendar.date(from: components),
               let yesterday = calendar.date(byAdding: .day, value: -1, to: resolved) {
                return format(yesterday)
            }
        }
        return format(date)
    }

    /// Start instant of the study day containing `date` — i.e. 8am IST on the
    /// anchor day. Useful for "today's sessions" queries.
    public static func start(of date: Date = Date()) -> Date {
        let key = anchor(for: date)
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return date }
        var components = DateComponents()
        components.year = parts[0]
        components.month = parts[1]
        components.day = parts[2]
        components.hour = rolloverHour
        return calendar.date(from: components) ?? date
    }

    /// The last `count` anchors, oldest first, ending with today's.
    public static func recentAnchors(count: Int, from date: Date = Date()) -> [String] {
        let today = start(of: date)
        return (0..<count).reversed().compactMap { offset in
            calendar.date(byAdding: .day, value: -offset, to: today).map(format)
        }
    }

    /// Short weekday label ("Mon") for an anchor key, for chart axes.
    public static func weekdayLabel(for anchor: String) -> String {
        let parts = anchor.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return "" }
        var components = DateComponents()
        components.year = parts[0]
        components.month = parts[1]
        components.day = parts[2]
        components.hour = 12
        guard let date = calendar.date(from: components) else { return "" }
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = timeZone
        formatter.locale = Locale(identifier: "en_US")
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    private static func format(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }
}
