import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

/// The Lock Screen presentation.
///
/// Sized and weighted for a glance from a face-down phone picked up mid-session:
/// the remaining time is the largest thing on it, and the blocked count is there to
/// answer "did the block actually turn on" without unlocking.
struct LockScreenView: View {
    let context: ActivityViewContext<FocusActivityAttributes>

    private var tint: Color { context.attributes.mode.tint }

    var body: some View {
        HStack(spacing: 16) {
            ring

            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 6) {
                    Image(systemName: context.attributes.mode.symbol)
                        .font(.system(size: 10, weight: .bold))
                    Text(context.attributes.mode.title.uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(0.8)
                }
                .foregroundStyle(tint)

                Text(
                    timerInterval: context.state.timerRange,
                    pauseTime: context.state.pausedAt,
                    countsDown: true,
                    showsHours: true
                )
                .font(.system(size: 32, weight: .medium, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Theme.primaryText)

                HStack(spacing: 8) {
                    if context.state.isPaused {
                        Label("Paused", systemImage: "pause.circle.fill")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Theme.amber)
                    } else if context.state.blockedCount > 0 {
                        Label("\(context.state.blockedCount) apps blocked", systemImage: "lock.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.tertiaryText)
                    } else {
                        Text("\(context.attributes.plannedMinutes) minute session")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.tertiaryText)
                    }
                }
            }

            Spacer(minLength: 0)

            controls
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    /// Static ring: it reflects progress at the moment of the last update rather
    /// than animating. A `ProgressView(timerInterval:)` would animate, but it can't
    /// be drawn as a ring with a rounded cap — and the digits already carry the
    /// motion, so the ring earns more as a shape than as an animation.
    private var ring: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.1), style: StrokeStyle(lineWidth: 5, lineCap: .round))
            Circle()
                .trim(from: 0, to: max(0.001, min(1, context.state.progress)))
                .stroke(tint, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Image(systemName: context.state.isPaused ? "pause.fill" : "bolt.fill")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(tint)
        }
        .frame(width: 46, height: 46)
    }

    private var controls: some View {
        VStack(spacing: 6) {
            if context.state.isPaused {
                Button(intent: ResumeSessionIntent()) {
                    Image(systemName: "play.fill")
                        .font(.system(size: 13, weight: .bold))
                        .frame(width: 34, height: 30)
                }
                .tint(tint)
            } else {
                Button(intent: PauseSessionIntent()) {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 13, weight: .bold))
                        .frame(width: 34, height: 30)
                }
                .tint(Theme.secondaryText)
            }

            Button(intent: EndSessionIntent()) {
                Image(systemName: "stop.fill")
                    .font(.system(size: 12, weight: .bold))
                    .frame(width: 34, height: 30)
            }
            .tint(Theme.secondaryText)
        }
        .buttonStyle(.bordered)
    }
}
