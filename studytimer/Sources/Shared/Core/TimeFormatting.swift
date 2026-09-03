import Foundation

/// Duration formatting used by the app, the Live Activity and the shield screen.
/// Centralised because three processes render the same numbers and they should
/// never disagree about, say, whether to show a leading zero.
public enum TimeFormatting {

    /// `mm:ss`, or `h:mm:ss` past an hour. Monospaced-friendly.
    public static func clock(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds.rounded()))
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        return h > 0
            ? String(format: "%d:%02d:%02d", h, m, s)
            : String(format: "%02d:%02d", m, s)
    }

    /// Conversational remaining time for the shield and notifications:
    /// "42 minutes left", "1 hour 5 minutes left".
    public static func remainingPhrase(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds.rounded()))
        if total < 60 { return "less than a minute left" }

        let h = total / 3600
        let m = (total % 3600) / 60

        switch (h, m) {
        case (0, let m):
            return "\(m) minute\(m == 1 ? "" : "s") left"
        case (let h, 0):
            return "\(h) hour\(h == 1 ? "" : "s") left"
        case (let h, let m):
            return "\(h)h \(m)m left"
        }
    }

    /// Hours to one decimal place, matching how the web app reports daily totals.
    public static func hours(_ seconds: TimeInterval) -> String {
        String(format: "%.1f", max(0, seconds) / 3600)
    }

    /// "1h 05m" for history rows.
    public static func compact(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds.rounded()))
        let h = total / 3600
        let m = (total % 3600) / 60
        if h == 0 { return "\(m)m" }
        return String(format: "%dh %02dm", h, m)
    }
}
