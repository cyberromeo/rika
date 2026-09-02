import SwiftUI

/// The Overview sub-tab: exam countdown, three stat cards, quick focus launcher.
struct StudyOverviewTab: View {

    @Environment(TrackerStore.self) private var tracker
    @Environment(StudyStore.self) private var study

    let onOpen: (StudySubTab) -> Void

    /// Ticks once a second so the countdown's seconds field moves. `TimelineView`
    /// keeps that redraw scoped to the countdown rather than the whole screen.
    var body: some View {
        ScrollView {
            VStack(spacing: Metrics.cardSpacing) {
                countdownCard
                statCards
                quickLauncher
            }
            .pageInset()
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
    }

    // ── Countdown ───────────────────────────────────────────────────────────

    private var countdownCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("FMGE Jan 2027")
                    .font(Typo.micro)
                    .foregroundStyle(Palette.blue)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Capsule().fill(Palette.blue.opacity(0.14)))
                Spacer()
                Text("Countdown").eyebrow()
            }

            TimelineView(.periodic(from: .now, by: 1)) { context in
                let parts = Countdown.parts(until: Syllabus.examDate, now: context.date)
                HStack(spacing: 6) {
                    countdownBox("\(parts.days)", "Days")
                    separator
                    countdownBox(String(format: "%02d", parts.hours), "Hours")
                    separator
                    countdownBox(String(format: "%02d", parts.minutes), "Mins")
                    separator
                    countdownBox(String(format: "%02d", parts.seconds), "Secs", accent: true)
                }
            }
        }
        .card()
    }

    private func countdownBox(_ value: String, _ label: String, accent: Bool = false) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(Typo.ticking(23))
                .foregroundStyle(accent ? Palette.orange : Palette.text)
            Text(label).eyebrow()
        }
        .frame(maxWidth: .infinity)
    }

    private var separator: some View {
        Text(":")
            .font(Typo.numeral(18))
            .foregroundStyle(Palette.hint)
            .padding(.bottom, 12)
    }

    // ── Stat cards ──────────────────────────────────────────────────────────

    private var statCards: some View {
        VStack(spacing: Metrics.cardSpacing) {
            syllabusCard
            studyTimeCard
            streakCard
        }
    }

    private var syllabusCard: some View {
        let data = tracker.data
        return HStack(spacing: 14) {
            ZStack {
                ProgressRing(
                    progress: Double(data?.progressPercent ?? 0) / 100,
                    tint: Palette.blue,
                    lineWidth: 4
                )
                Text("\(data?.progressPercent ?? 0)%")
                    .font(Typo.numeral(15))
                    .foregroundStyle(Palette.text)
            }
            .frame(width: 56, height: 56)

            VStack(alignment: .leading, spacing: 2) {
                Text("Syllabus Progress").eyebrow()
                Text("\(data?.completedItems ?? 0) / \(Syllabus.totalItems) items")
                    .font(Typo.title)
                    .foregroundStyle(Palette.text)
                Text("\(data?.completedSubjects ?? 0) subjects · \(data?.completedGTs ?? 0) GTs done")
                    .font(Typo.micro)
                    .foregroundStyle(Palette.hint)
            }
            Spacer(minLength: 0)
        }
        .cardButton { onOpen(.subjects) }
    }

    private var studyTimeCard: some View {
        let state = study.state
        return HStack(spacing: 14) {
            iconBadge("clock", tint: Palette.blue)
            VStack(alignment: .leading, spacing: 2) {
                Text("Today's Study Time").eyebrow()
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(state?.todayStudyHoursDisplay ?? "0.0") hrs")
                        .font(Typo.title)
                        .foregroundStyle(Palette.text)
                    Text("/ \(state?.studyGoalHours ?? 11)h goal")
                        .font(Typo.micro)
                        .foregroundStyle(Palette.hint)
                }
                Text("PYQs: \(state?.todayPyqHoursDisplay ?? "0.0") hrs / \(state?.pyqGoalHours ?? 2)h goal")
                    .font(Typo.micro)
                    .foregroundStyle(Palette.hint)
            }
            Spacer(minLength: 0)
        }
        .cardButton { onOpen(.timer) }
    }

    private var streakCard: some View {
        HStack(spacing: 14) {
            iconBadge("flame.fill", tint: Palette.orange)
            VStack(alignment: .leading, spacing: 2) {
                Text("Study Streak").eyebrow()
                Text("\(study.state?.streak ?? 0) Days")
                    .font(Typo.title)
                    .foregroundStyle(Palette.text)
                Text("Keep the momentum going!")
                    .font(Typo.micro)
                    .foregroundStyle(Palette.hint)
            }
            Spacer(minLength: 0)
        }
        .card()
    }

    private func iconBadge(_ symbol: String, tint: Color) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: 44, height: 44)
            .background(RoundedRectangle(cornerRadius: Metrics.radiusMedium).fill(tint.opacity(0.14)))
    }

    // ── Quick launcher ──────────────────────────────────────────────────────

    private var quickLauncher: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.orange)
                    Text("Quick Focus Launcher").cardTitle()
                }
                Spacer()
                Text("Synced to API").eyebrow()
            }

            HStack(spacing: 8) {
                launchButton("1 Hour Study", symbol: "book.fill", tint: Palette.blue, mode: .study, minutes: 60)
                launchButton("45m PYQ", symbol: "target", tint: Palette.orange, mode: .pyq, minutes: 45)
                launchButton("10m Break", symbol: "cup.and.saucer.fill", tint: Palette.green, mode: .break10, minutes: 10)
            }
        }
        .card()
    }

    private func launchButton(
        _ title: String,
        symbol: String,
        tint: Color,
        mode: TimerMode,
        minutes: Int
    ) -> some View {
        Button {
            study.selectPreset(minutes: minutes, mode: mode)
            onOpen(.timer)
        } label: {
            VStack(spacing: 6) {
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .semibold))
                Text(title)
                    .font(Typo.micro)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .foregroundStyle(tint)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: Metrics.radiusMedium).fill(tint.opacity(0.12)))
            .contentShape(.rect(cornerRadius: Metrics.radiusMedium))
        }
        .buttonStyle(.plain)
    }
}

/// Days / hours / minutes / seconds until a date.
enum Countdown {
    struct Parts {
        var days = 0
        var hours = 0
        var minutes = 0
        var seconds = 0
    }

    static func parts(until target: Date, now: Date = Date()) -> Parts {
        let remaining = Int(target.timeIntervalSince(now))
        guard remaining > 0 else { return Parts() }
        return Parts(
            days: remaining / 86_400,
            hours: (remaining % 86_400) / 3_600,
            minutes: (remaining % 3_600) / 60,
            seconds: remaining % 60
        )
    }
}
