import SwiftUI

/// The Timer sub-tab: mode selector, the countdown ring, presets, actions, and
/// the weekly breakdown.
struct FocusTimerTab: View {

    @Environment(StudyStore.self) private var study

    private var timer: FocusTimerEngine { study.timer }
    private let presets = [25, 45, 60, 90]

    var body: some View {
        ScrollView {
            VStack(spacing: Metrics.cardSpacing) {
                timerCard
                if let state = study.state, !state.weeklyHistory.isEmpty {
                    WeeklyStudyChart(state: state)
                }
            }
            .pageInset()
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
    }

    // ── Timer card ──────────────────────────────────────────────────────────

    private var timerCard: some View {
        VStack(spacing: 16) {
            modeSelector
            ring
            presetRow
            actions
        }
        .card()
    }

    private var modeSelector: some View {
        HStack(spacing: 6) {
            modeButton(.study, tint: Palette.blue)
            modeButton(.pyq, tint: Palette.orange)
            modeButton(.break10, tint: Palette.green)
        }
    }

    private func modeButton(_ mode: TimerMode, tint: Color) -> some View {
        let active = timer.mode == mode
        return Button {
            study.setMode(mode)
        } label: {
            VStack(spacing: 4) {
                Image(systemName: mode.symbol)
                    .font(.system(size: 13, weight: .semibold))
                Text(mode.label)
                    .font(.system(size: 10, weight: .medium))
                    .lineLimit(1)
            }
            .foregroundStyle(active ? tint : Palette.hint)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: Metrics.radiusMedium)
                    .fill(tint.opacity(active ? 0.14 : 0.03))
            )
            .contentShape(.rect(cornerRadius: Metrics.radiusMedium))
        }
        .buttonStyle(.plain)
        .disabled(timer.isRunning)
        .opacity(timer.isRunning && !active ? 0.4 : 1)
    }

    private var ring: some View {
        ZStack {
            ProgressRing(progress: timer.progress, tint: modeTint, lineWidth: 8)
            VStack(spacing: 4) {
                Text(timer.clockText)
                    .font(Typo.ticking(40))
                    .foregroundStyle(Palette.text)
                Text("\(timer.mode.rawValue.uppercased()) SESSION")
                    .font(Typo.micro)
                    .tracking(Typo.trackingWide)
                    .foregroundStyle(Palette.hint)
            }
        }
        .frame(width: 210, height: 210)
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(timer.clockText) remaining in \(timer.mode.rawValue) session")
    }

    private var modeTint: Color {
        switch timer.mode {
        case .study: return Palette.blue
        case .pyq: return Palette.orange
        case .break10, .break20: return Palette.green
        }
    }

    private var presetRow: some View {
        HStack(spacing: 6) {
            ForEach(presets, id: \.self) { minutes in
                let selected = timer.totalSeconds == minutes * 60
                Button {
                    study.selectPreset(minutes: minutes)
                } label: {
                    Text("\(minutes)m")
                        .font(Typo.label)
                        .foregroundStyle(selected ? Palette.text : Palette.hint)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(
                            Capsule().fill(Color.white.opacity(selected ? 0.12 : 0.04))
                        )
                        .contentShape(.capsule)
                }
                .buttonStyle(.plain)
                .disabled(timer.isRunning)
            }
        }
        .opacity(timer.isRunning ? 0.4 : 1)
    }

    private var actions: some View {
        VStack(spacing: 8) {
            Button {
                Task { await study.toggleTimer() }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: timer.isRunning ? "pause.fill" : "play.fill")
                    Text(timer.isRunning ? "Pause" : "Start Focus Timer")
                }
                .font(Typo.title)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
            }
            .buttonStyle(.glassProminent)
            .tint(modeTint)

            HStack(spacing: 8) {
                Button {
                    Task { await study.resetTimer() }
                } label: {
                    Label("Reset", systemImage: "arrow.counterclockwise")
                        .font(Typo.label)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.glass)

                Button {
                    Task { await study.finishAndLog() }
                } label: {
                    Label("Finish & Log", systemImage: "checkmark")
                        .font(Typo.label)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.glass)
                .disabled(timer.elapsedSeconds <= 0)
            }
        }
    }
}
