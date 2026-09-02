import SwiftUI

/// Port of src/components/AiUsageWidget.tsx — three OpenCode quota windows as
/// rings. Fetched once per appearance; the quota moves slowly enough that
/// polling it would be noise.
struct AIUsageCard: View {

    @State private var usage: AIUsage?
    @State private var loading = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header

            if loading {
                ProgressView()
                    .controlSize(.small)
                    .frame(maxWidth: .infinity, minHeight: 64)
            } else if let usage, !usage.isEmpty {
                HStack(spacing: 10) {
                    ForEach(usage.tiles, id: \.label) { tile in
                        tileView(short: tile.short, stat: tile.stat)
                    }
                }
            } else {
                Text("—")
                    .font(Typo.numeral(20))
                    .foregroundStyle(Palette.hint)
                    .frame(maxWidth: .infinity, minHeight: 64)
            }
        }
        .card()
        .task {
            usage = AIUsageService.shared.cached()
            usage = (try? await AIUsageService.shared.fetch()) ?? usage
            loading = false
        }
    }

    private var header: some View {
        HStack(spacing: 6) {
            Image(systemName: "sparkles")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.blue)
            Text("AI").cardTitle()
            Circle()
                .fill(dotColor)
                .frame(width: 6, height: 6)
            Spacer()
        }
    }

    private var dotColor: Color {
        switch usage?.overallSeverity ?? .ok {
        case .ok: return Palette.green
        case .warn: return Palette.orange
        case .critical: return Palette.red
        }
    }

    private func tileView(short: String, stat: UsageStat) -> some View {
        VStack(spacing: 6) {
            Text(short).eyebrow()

            ZStack {
                ProgressRing(
                    progress: Double(min(stat.usagePercent, 100)) / 100,
                    tint: tint(for: stat.severity),
                    lineWidth: 3
                )
                Text("\(stat.usagePercent)")
                    .font(Typo.numeral(15))
                    .foregroundStyle(Palette.text)
            }
            .frame(width: 46, height: 46)

            Text(stat.resetLabel)
                .font(Typo.micro)
                .foregroundStyle(Palette.hint)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(short) usage \(stat.usagePercent) percent, resets in \(stat.resetLabel)")
    }

    private func tint(for severity: UsageSeverity) -> Color {
        switch severity {
        case .ok: return Palette.blue
        case .warn: return Palette.orange
        case .critical: return Palette.red
        }
    }
}
