import Foundation
import BackgroundTasks
import WidgetKit

/// Background refresh: pull the four cheap endpoints and reload widget
/// timelines, so the widgets are current even if the app has not been opened.
///
/// Registration happens through SwiftUI's `.backgroundTask(.appRefresh(_:))` in
/// `RikaApp`; this type owns the work and the rescheduling.
enum RefreshScheduler {

    /// Ask the system for another window. iOS decides when — this is a hint, not
    /// a guarantee, so nothing in the app depends on it having run.
    static func scheduleNext(after interval: TimeInterval = 30 * 60) {
        let request = BGAppRefreshTaskRequest(identifier: AppConfig.refreshTaskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: interval)
        try? BGTaskScheduler.shared.submit(request)
    }

    /// Refreshes everything the widgets read, then reloads them.
    ///
    /// Each fetch writes its own cache entry, so a partial success still improves
    /// the widgets. Failures are swallowed: there is no UI to report them to, and
    /// a thrown error would only cost the remaining fetches.
    static func runRefresh() async {
        scheduleNext()

        await withTaskGroup(of: Void.self) { group in
            group.addTask { _ = try? await MotraService.shared.fetch() }
            group.addTask { _ = try? await TrackerService.shared.fetch() }
            group.addTask { _ = try? await StudyTimeService.shared.fetch() }
            group.addTask { await refreshPowerToday() }
        }

        WidgetCenter.shared.reloadAllTimelines()
    }

    /// The power widget only needs the current month's daily rows and the month
    /// totals; a full three-grain load would be wasteful in a background window.
    private static func refreshPowerToday() async {
        guard AppSecrets.hasMiraie else { return }
        let now = Date()

        if let entries = try? await MiraieService.shared.daily(
            from: DayKey.startOfMonth(now),
            to: DayKey.endOfMonth(now)
        ) {
            var map = AppGroupCache.load(.powerDaily, as: [String: Double].self) ?? [:]
            for entry in entries where !entry.key.isEmpty { map[entry.key] = entry.power }
            AppGroupCache.save(.powerDaily, map)
        }

        if let entries = try? await MiraieService.shared.monthly(
            from: DayKey.adding(months: -1, to: now),
            to: now
        ) {
            var map = AppGroupCache.load(.powerMonthly, as: [String: Double].self) ?? [:]
            for entry in entries where !entry.key.isEmpty { map[entry.key] = entry.power }
            AppGroupCache.save(.powerMonthly, map)
        }
    }
}
