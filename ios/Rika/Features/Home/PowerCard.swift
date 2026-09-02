import SwiftUI

/// Port of src/components/PowerWidget.tsx — today / week / month kWh, tapping
/// through to the chart sheet.
struct PowerCard: View {

    @Environment(PowerStore.self) private var power
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header

            if power.loading && power.dailyByDay.isEmpty {
                ProgressView()
                    .controlSize(.small)
                    .frame(maxWidth: .infinity, minHeight: 52)
            } else {
                HStack(spacing: 0) {
                    stat(power.todayPower, label: "Today", prominent: true)
                    divider
                    stat(power.thisWeekPower, label: "This Week")
                    divider
                    stat(power.thisMonthPower, label: "This Month")
                }
            }
        }
        .cardButton {
            Haptics.light()
            onTap()
        }
        .accessibilityLabel(
            "AC power usage. Today \(formatKwh(power.todayPower)) kilowatt hours. Open chart."
        )
    }

    private var header: some View {
        HStack(spacing: 6) {
            Image(systemName: "bolt.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.orange)
            Text("AC Power").cardTitle()
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Palette.hint)
        }
    }

    private func stat(_ value: Double, label: String, prominent: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(formatKwh(value))
                    .font(Typo.numeral(prominent ? 24 : 18))
                    .foregroundStyle(prominent ? Palette.orange : Palette.text)
                Text("kWh")
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
            .frame(width: 1, height: 28)
            .padding(.horizontal, 6)
    }
}
