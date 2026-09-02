import DeviceActivity
import SwiftUI

/// Renders real device usage.
///
/// Everything here runs inside a heavily sandboxed extension: no network, and no
/// way to hand these numbers back to the app that embedded the view. That's a
/// deliberate privacy boundary, and it's why usage lives in its own embedded panel
/// rather than feeding the app's own charts or syncing to medx — the app literally
/// cannot see these totals.
@main
struct LockInReportExtension: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene {
        DailyTotalScene { summary in
            UsageSummaryView(summary: summary)
        }
    }
}

/// Flattened, sendable snapshot of one reporting window.
struct UsageSummary {
    struct Row: Identifiable {
        let id: String
        let name: String
        let duration: TimeInterval
    }

    var totalDuration: TimeInterval = 0
    var pickups: Int = 0
    var categories: [Row] = []
    var apps: [Row] = []
}

struct DailyTotalScene: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .dailyTotal
    let content: (UsageSummary) -> UsageSummaryView

    func makeConfiguration(
        representing data: DeviceActivityResults<DeviceActivityData.ActivitySegment>
    ) async -> UsageSummary {
        var summary = UsageSummary()
        var categoryTotals: [String: TimeInterval] = [:]
        var appTotals: [String: TimeInterval] = [:]

        for await segment in data {
            summary.totalDuration += segment.totalActivityDuration
            summary.pickups += segment.totalPickupsWithoutApplicationActivity

            for await category in segment.categories {
                let name = category.category.localizedDisplayName ?? "Other"
                categoryTotals[name, default: 0] += category.totalActivityDuration

                for await app in category.applications {
                    let appName = app.application.localizedDisplayName
                        ?? app.application.bundleIdentifier
                        ?? "Unknown"
                    appTotals[appName, default: 0] += app.totalActivityDuration
                }
            }
        }

        summary.categories = categoryTotals
            .map { UsageSummary.Row(id: $0.key, name: $0.key, duration: $0.value) }
            .sorted { $0.duration > $1.duration }

        summary.apps = Array(
            appTotals
                .map { UsageSummary.Row(id: $0.key, name: $0.key, duration: $0.value) }
                .sorted { $0.duration > $1.duration }
                .prefix(6)
        )

        return summary
    }
}
