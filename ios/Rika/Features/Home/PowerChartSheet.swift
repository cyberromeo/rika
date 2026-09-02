import SwiftUI
import Charts

/// Port of src/components/PowerChartOverlay.tsx as a sheet.
///
/// The web version hand-draws SVG rects with text labels; Swift Charts gives the
/// same bars, value annotations and axis for a fraction of the code. The sheet
/// background is left alone — iOS 26 applies Liquid Glass to partial-height
/// sheets, and setting `presentationBackground` would override it.
struct PowerChartSheet: View {

    @Environment(PowerStore.self) private var power
    @Environment(\.dismiss) private var dismiss
    @State private var range: PowerChartRange = .days

    private var series: [PowerPoint] { power.series(for: range) }
    private var total: Double { series.reduce(0) { $0 + $1.value } }
    private var maxValue: Double { max(series.map(\.value).max() ?? 0, 0.1) }

    private var tint: Color {
        switch range {
        case .days: return Palette.blue
        case .weeks: return Palette.green
        case .months: return Palette.orange
        }
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                picker
                chart
                Text("\(formatKwh(maxValue)) kWh max")
                    .font(Typo.micro)
                    .foregroundStyle(Palette.hint)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Spacer(minLength: 0)
            }
            .padding(.top, 8)
            .pageInset()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 1) {
                        Text("Power Usage").font(Typo.title)
                        Text("\(formatKwh(total)) kWh total")
                            .font(Typo.micro)
                            .foregroundStyle(Palette.hint)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private var picker: some View {
        Picker("Range", selection: $range) {
            ForEach(PowerChartRange.allCases) { option in
                Text(option.label).tag(option)
            }
        }
        .pickerStyle(.segmented)
        .onChange(of: range) { _, _ in Haptics.light() }
    }

    @ViewBuilder
    private var chart: some View {
        if series.isEmpty || total == 0 {
            VStack(spacing: 8) {
                Image(systemName: "bolt.slash")
                    .font(.system(size: 26, weight: .light))
                Text("No usage recorded for this range")
                    .font(Typo.label)
            }
            .foregroundStyle(Palette.hint)
            .frame(maxWidth: .infinity, minHeight: 200)
        } else {
            Chart(series) { point in
                BarMark(
                    x: .value("Period", point.label),
                    y: .value("kWh", point.value),
                    width: .automatic
                )
                .foregroundStyle(tint.opacity(0.85))
                .cornerRadius(4)
                .annotation(position: .top, alignment: .center, spacing: 2) {
                    if point.value > 0 {
                        Text(formatKwh(point.value))
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(Palette.hint)
                    }
                }
            }
            .chartYAxis {
                AxisMarks { _ in
                    AxisGridLine().foregroundStyle(Color.white.opacity(0.06))
                }
            }
            .chartXAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let label = value.as(String.self) {
                            Text(label)
                                .font(.system(size: 10))
                                .foregroundStyle(Palette.hint)
                        }
                    }
                }
            }
            .frame(height: 220)
        }
    }
}
