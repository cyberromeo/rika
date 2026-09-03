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

/// Flattened snapshot of one reporting window.
///
/// `Sendable` is required, not decorative: `makeConfiguration` is `async`, so the
/// configuration crosses an isolation boundary on its way to the view.
struct UsageSummary: Sendable {
    struct Row: Identifiable, Sendable {
        let id: String
        let name: String
        let duration: TimeInterval
    }

    var totalDuration: TimeInterval = 0
    var categories: [Row] = []
    var apps: [Row] = []
}

struct DailyTotalScene: DeviceActivityReportScene {
    // Spelled out rather than left to inference. When a `DeviceActivityReportScene`
    // fails to conform, the compiler reports the conformance failure and not the
    // underlying mismatch, so pinning both associated types turns a dead-end error
    // into a specific one.
    typealias Configuration = UsageSummary
    typealias Content = UsageSummaryView

    let context: DeviceActivityReport.Context = .dailyTotal
    let content: (UsageSummary) -> UsageSummaryView

    /// Note the parameter type: `DeviceActivityResults<DeviceActivityData>`, not
    /// `<DeviceActivityData.ActivitySegment>`. The results sequence yields one
    /// `DeviceActivityData` per user/device pairing, and the segments hang off each
    /// of those — hence the nested `for await`. Getting this wrong produces only
    /// "does not conform to DeviceActivityReportScene", with no hint as to why.
    func makeConfiguration(
        representing data: DeviceActivityResults<DeviceActivityData>
    ) async -> UsageSummary {
        var summary = UsageSummary()
        var categoryTotals: [String: TimeInterval] = [:]
        var appTotals: [String: TimeInterval] = [:]

        for await entry in data {
            for await segment in entry.activitySegments {
                summary.totalDuration += segment.totalActivityDuration

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
