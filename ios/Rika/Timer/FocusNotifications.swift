import Foundation
import UserNotifications

/// The one local notification the app schedules: "your focus session is done".
///
/// It is scheduled at the deadline rather than fired on completion, so it
/// arrives even when the app has been suspended or killed in the meantime —
/// which is the case the web app could never cover.
enum FocusNotifications {

    private static let identifier = "focus-timer-complete"

    static func requestAuthorizationIfNeeded() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .notDetermined else { return }
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
    }

    /// Replaces any previously scheduled completion notification.
    static func schedule(at deadline: Date, mode: TimerMode) async {
        cancel()

        let interval = deadline.timeIntervalSinceNow
        guard interval > 1 else { return }

        let content = UNMutableNotificationContent()
        content.title = title(for: mode)
        content.body = body(for: mode)
        content.sound = .default
        content.interruptionLevel = .timeSensitive

        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        )
        try? await UNUserNotificationCenter.current().add(request)
    }

    static func cancel() {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [identifier])
    }

    private static func title(for mode: TimerMode) -> String {
        switch mode {
        case .study: return "Study session complete"
        case .pyq: return "PYQ session complete"
        case .break10, .break20: return "Break over"
        }
    }

    private static func body(for mode: TimerMode) -> String {
        switch mode {
        case .study, .pyq: return "Logged to your study time. Take a break or start another."
        case .break10, .break20: return "Back to it."
        }
    }
}
