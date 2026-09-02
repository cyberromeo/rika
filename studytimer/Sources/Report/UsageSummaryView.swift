import SwiftUI

/// The usage panel embedded in the Insights tab.
///
/// Styled to match the app so the seam isn't obvious, but note the boundary: this
/// view runs in the report extension's process. It can render these numbers and
/// nothing else can read them.
struct UsageSummaryView: View {
    let summary: UsageSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            header

            if summary.categories.isEmpty {
                Text("No usage recorded for this window yet.")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.tertiaryText)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                categoryBars
                if !summary.apps.isEmpty { appList }
            }
        }
        .padding(18)
        .background(Theme.background)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("SCREEN TIME")
                .font(Theme.eyebrow)
                .foregroundStyle(Theme.tertiaryText)
            Text(TimeFormatting.compact(summary.totalDuration))
                .font(.system(size: 34, weight: .semibold, design: .rounded))
                .foregroundStyle(Theme.primaryText)
                .contentTransition(.numericText())
        }
    }

    private var categoryBars: some View {
        VStack(spacing: 10) {
            ForEach(summary.categories.prefix(5)) { row in
                HStack(spacing: 12) {
                    Text(row.name)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Theme.primaryText)
                        .lineLimit(1)
                        .frame(width: 96, alignment: .leading)

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Theme.surface)
                            Capsule()
                                .fill(Theme.blue.opacity(0.85))
                                .frame(width: geo.size.width * fraction(row.duration))
                        }
                    }
                    .frame(height: 6)

                    Text(TimeFormatting.compact(row.duration))
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(Theme.secondaryText)
                        .frame(width: 54, alignment: .trailing)
                }
            }
        }
    }

    private var appList: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("MOST USED")
                .font(Theme.eyebrow)
                .foregroundStyle(Theme.tertiaryText)
            ForEach(summary.apps) { row in
                HStack {
                    Text(row.name)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.primaryText)
                        .lineLimit(1)
                    Spacer(minLength: 12)
                    Text(TimeFormatting.compact(row.duration))
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(Theme.secondaryText)
                }
                if row.id != summary.apps.last?.id {
                    Divider().overlay(Theme.hairline)
                }
            }
        }
    }

    /// Longest category defines full width — absolute scaling would leave every bar
    /// near-empty on a light usage day.
    private func fraction(_ duration: TimeInterval) -> Double {
        let peak = summary.categories.first?.duration ?? 0
        guard peak > 0 else { return 0 }
        return min(1, max(0.02, duration / peak))
    }
}
