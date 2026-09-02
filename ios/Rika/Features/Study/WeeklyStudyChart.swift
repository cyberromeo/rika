import SwiftUI
import Charts

/// Port of the weekly breakdown in StudyPage.tsx:700 — study and PYQ hours
/// stacked per day, with the two totals in the legend.
struct WeeklyStudyChart: View {

    let state: StudyTimeState

    private struct Bar: Identifiable {
        let id: String
        let day: String
        let kind: String
        let hours: Double
    }

    private var bars: [Bar] {
        state.weeklyHistory.flatMap { log in
            [
                Bar(id: "\(log.date)-study", day: log.day, kind: "Study", hours: log.studyHours),
                Bar(id: "\(log.date)-pyq", day: log.day, kind: "PYQ", hours: log.pyqHours),
            ]
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.blue)
                    Text("Weekly Study Breakdown").cardTitle()
                }
                Spacer()
                Text("\(Format.hours(state.weeklyGrandTotalHours)) hrs")
                    .font(Typo.label)
                    .foregroundStyle(Palette.blue)
            }

            Chart(bars) { bar in
                BarMark(
                    x: .value("Day", bar.day),
                    y: .value("Hours", bar.hours)
                )
                .foregroundStyle(by: .value("Kind", bar.kind))
                .cornerRadius(3)
            }
            .chartForegroundStyleScale([
                "Study": Palette.blue,
                "PYQ": Palette.orange,
            ])
            .chartLegend(.hidden)
            .chartYAxis {
                AxisMarks { _ in
                    AxisGridLine().foregroundStyle(Color.white.opacity(0.06))
                    AxisValueLabel()
                        .font(.system(size: 9))
                        .foregroundStyle(Palette.hint)
                }
            }
            .chartXAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let label = value.as(String.self) {
                            Text(label)
                                .font(.system(size: 9))
                                .foregroundStyle(Palette.hint)
                        }
                    }
                }
            }
            .frame(height: 160)

            HStack(spacing: 14) {
                legend("Study", hours: state.weeklyStudyTotalHours, tint: Palette.blue)
                legend("PYQ", hours: state.weeklyPyqTotalHours, tint: Palette.orange)
                Spacer()
            }
        }
        .card()
    }

    private func legend(_ title: String, hours: Double, tint: Color) -> some View {
        HStack(spacing: 5) {
            Circle().fill(tint).frame(width: 7, height: 7)
            Text("\(title) (\(Format.hours(hours))h)")
                .font(Typo.micro)
                .foregroundStyle(Palette.hint)
        }
    }
}
