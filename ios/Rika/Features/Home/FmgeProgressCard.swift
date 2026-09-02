import SwiftUI

/// Port of src/components/FmgeProgressWidget.tsx — ring, days-to-exam, and the
/// three-up subjects/GTs/items row.
struct FmgeProgressCard: View {

    @Environment(TrackerStore.self) private var tracker
    let onTap: () -> Void

    private var data: TrackerData? { tracker.data }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header

            if let data {
                HStack(spacing: 14) {
                    ring(percent: data.progressPercent)
                    stats(data)
                }
            } else {
                ProgressView()
                    .controlSize(.small)
                    .frame(maxWidth: .infinity, minHeight: 64)
            }

            footer
        }
        .cardButton {
            Haptics.light()
            onTap()
        }
        .accessibilityLabel("FMGE prep \(data?.progressPercent ?? 0) percent complete. Open tracker.")
    }

    private var header: some View {
        HStack(spacing: 6) {
            Image(systemName: "clock")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.blue)
            Text("FMGE Prep").cardTitle()
            Spacer()
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(data?.daysToExam ?? 0)")
                    .font(Typo.numeral(17))
                    .foregroundStyle(Palette.orange)
                Text("days left")
                    .font(Typo.micro)
                    .foregroundStyle(Palette.hint)
            }
        }
    }

    private func ring(percent: Int) -> some View {
        ZStack {
            ProgressRing(progress: Double(percent) / 100, tint: Palette.blue, lineWidth: 4)
            HStack(alignment: .firstTextBaseline, spacing: 0) {
                Text("\(percent)").font(Typo.numeral(20))
                Text("%").font(Typo.numeral(11))
            }
            .foregroundStyle(Palette.text)
        }
        .frame(width: 62, height: 62)
    }

    private func stats(_ data: TrackerData) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 0) {
                statCell("\(data.completedSubjects)", of: "/\(Syllabus.subjects.count)", label: "Subjects")
                divider
                statCell("\(data.completedGTs)", of: "/7", label: "GTs")
                divider
                statCell("\(data.completedItems)", of: "/\(Syllabus.totalItems)", label: "Items")
            }
            ProgressBar(progress: Double(data.progressPercent) / 100, tint: Palette.blue)
        }
    }

    private func statCell(_ value: String, of total: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(alignment: .firstTextBaseline, spacing: 0) {
                Text(value)
                    .font(Typo.numeral(15))
                    .foregroundStyle(Palette.text)
                Text(total)
                    .font(Typo.micro)
                    .foregroundStyle(Palette.hint)
            }
            Text(label).eyebrow()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var divider: some View {
        Rectangle()
            .fill(Palette.surfaceBorder)
            .frame(width: 1, height: 22)
            .padding(.horizontal, 4)
    }

    private var footer: some View {
        HStack {
            Text(data?.statusLabel ?? "Loading")
                .font(Typo.label)
                .foregroundStyle(Palette.hint)
            Spacer()
            HStack(spacing: 3) {
                Text("Open tracker")
                Image(systemName: "chevron.right")
                    .font(.system(size: 9, weight: .bold))
            }
            .font(Typo.label)
            .foregroundStyle(Palette.blue)
        }
    }
}
