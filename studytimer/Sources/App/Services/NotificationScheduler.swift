import Foundation
import UserNotifications

/// Local notifications for session end.
///
/// Necessary because the app is usually not running when a session ends — that's
/// the whole point. A scheduled `UNTimeIntervalNotificationTrigger` fires whether
/// the app is backgrounded, force-quit or the phone is locked.
///
/// Note the overlap with the backend: `api/studytime.js` also fires an ntfy siren
/// when a cloud timer expires, so this is switchable in Settings to avoid being
/// told twice.
final class NotificationScheduler {
    private let identifier = "lockin.session.complete"

    var isEnabled: Bool {
        get {
            // Default on — the alert is the point of the feature.
            AppGroup.defaults.object(forKey: StoreKey.localNotificationsEnabled) as? Bool ?? true
        }
        set { AppGroup.defaults.set(newValue, forKey: StoreKey.localNotificationsEnabled) }
    }

    @discardableResult
    func requestPermission() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    func scheduleCompletion(for session: Session) {
        guard isEnabled, session.state == .running else { return }
        let delay = session.remaining()
        guard delay > 1 else { return }

        let content = UNMutableNotificationContent()
        content.title = session.mode == .rest ? "Break's over" : "Session complete"
        content.body = session.mode == .rest
            ? "Back to it."
            : "\(TimeFormatting.compact(session.plannedDuration)) of \(session.mode.title.lowercased()) done. Apps are unblocked."
        content.sound = .default
        content.interruptionLevel = .timeSensitive

        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
        )

        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [identifier])
        center.add(request)
    }

    func cancelCompletion() {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [identifier])
    }
}
