import SwiftUI

/// Port of src/components/GymRecoveryWidget.tsx — recovery ring plus the three
/// most fatigued muscles as chips.
struct GymRecoveryCard: View {

    @Environment(MotraStore.self) private var motra
    let onTap: () -> Void

    private var data: MotraData? { motra.data }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header

            if let data {
                HStack(spacing: 14) {
                    ring(percent: data.recoveryPercent)
                    info(data)
                }
                footer(data)
            } else {
                ProgressView()
                    .controlSize(.small)
                    .frame(maxWidth: .infinity, minHeight: 64)
            }
        }
        .cardButton {
            Haptics.light()
            onTap()
        }
        .accessibilityLabel("Gym recovery \(data?.recoveryPercent ?? 0) percent. Open gym.")
    }

    private var header: some View {
        HStack(spacing: 6) {
            Image(systemName: "dumbbell.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.green)
            Text("Gym").cardTitle()
            Spacer()
            Text(data?.statusLabel ?? "Loading")
                .font(Typo.micro)
                .foregroundStyle(Palette.hint)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Capsule().fill(Color.white.opacity(0.06)))
        }
    }

    private func ring(percent: Int) -> some View {
        ZStack {
            ProgressRing(progress: Double(percent) / 100, tint: Palette.green, lineWidth: 4)
            HStack(alignment: .firstTextBaseline, spacing: 0) {
                Text("\(percent)").font(Typo.numeral(20))
                Text("%").font(Typo.numeral(11))
            }
            .foregroundStyle(Palette.text)
        }
        .frame(width: 62, height: 62)
    }

    private func info(_ data: MotraData) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(data.recoveredMuscles)
                    .font(Typo.numeral(16))
                    .foregroundStyle(Palette.text)
                Text("muscles recovered")
                    .font(Typo.label)
                    .foregroundStyle(Palette.hint)
            }

            let fatigued = Array(data.musclesNeedingRecovery.prefix(3))
            if fatigued.isEmpty {
                chip(text: "Ready to train", tier: .ready)
            } else {
                // A wrapping row: three chips fit on one line on every current
                // iPhone width, and Layout handles it if they do not.
                HStack(spacing: 5) {
                    ForEach(fatigued) { muscle in
                        chip(text: "\(muscle.label) \(muscle.recovery)%", tier: muscle.tier)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func chip(text: String, tier: RecoveryTier) -> some View {
        Text(text)
            .font(Typo.micro)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .foregroundStyle(Palette.tier(tier))
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Capsule().fill(Palette.tier(tier).opacity(0.14)))
    }

    private func footer(_ data: MotraData) -> some View {
        HStack {
            Text(lastSessionText(data))
                .font(Typo.label)
                .foregroundStyle(Palette.hint)
                .lineLimit(1)
            Spacer()
            HStack(spacing: 3) {
                Text("Open gym")
                Image(systemName: "chevron.right")
                    .font(.system(size: 9, weight: .bold))
            }
            .font(Typo.label)
            .foregroundStyle(Palette.green)
        }
    }

    private func lastSessionText(_ data: MotraData) -> String {
        guard let last = data.lastWorkout, let date = DayKey.date(from: last.date) else {
            return "\(data.lifetime.workouts) lifetime workouts"
        }
        let relative = DateDisplay.relativeDay(date, capitalized: false)
        return "Last \(relative) · \(data.lifetime.workouts) lifetime"
    }
}
