import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct LockInWidgetBundle: WidgetBundle {
    var body: some Widget {
        FocusLiveActivity()
    }
}

/// Lock Screen and Dynamic Island presentations.
///
/// Every countdown here is `Text(timerInterval:)` or `ProgressView(timerInterval:)`,
/// which the system animates from the dates alone. That's the reason this Activity
/// needs no updates while it runs: the app pushes state four times per session
/// (start, pause, resume, end) and the ticking is free. It also means the countdown
/// stays correct if the app is force-quit.
struct FocusLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FocusActivityAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(.black)
                .activitySystemActionForegroundColor(context.attributes.mode.tint)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(context.attributes.mode.title, systemImage: context.attributes.mode.symbol)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(context.attributes.mode.tint)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    TimerText(state: context.state, size: 17)
                        .foregroundStyle(Theme.primaryText)
                }
                DynamicIslandExpandedRegion(.center) {
                    if context.state.blockedCount > 0 {
                        Label("\(context.state.blockedCount) blocked", systemImage: "lock.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.tertiaryText)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 10) {
                        ProgressView(
                            timerInterval: context.state.timerRange,
                            countsDown: false,
                            label: { EmptyView() },
                            currentValueLabel: { EmptyView() }
                        )
                        .tint(context.attributes.mode.tint)
                        .labelsHidden()

                        HStack(spacing: 8) {
                            if context.state.isPaused {
                                Button(intent: ResumeSessionIntent()) {
                                    Label("Resume", systemImage: "play.fill")
                                        .font(.system(size: 13, weight: .semibold))
                                        .frame(maxWidth: .infinity)
                                }
                                .tint(context.attributes.mode.tint)
                            } else {
                                Button(intent: PauseSessionIntent()) {
                                    Label("Pause", systemImage: "pause.fill")
                                        .font(.system(size: 13, weight: .semibold))
                                        .frame(maxWidth: .infinity)
                                }
                                .tint(Theme.secondaryText)
                            }

                            Button(intent: EndSessionIntent()) {
                                Label("End", systemImage: "stop.fill")
                                    .font(.system(size: 13, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                            }
                            .tint(Theme.secondaryText)
                        }
                        .buttonStyle(.bordered)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.isPaused ? "pause.fill" : context.attributes.mode.symbol)
                    .foregroundStyle(context.attributes.mode.tint)
            } compactTrailing: {
                TimerText(state: context.state, size: 13)
                    .foregroundStyle(context.attributes.mode.tint)
                    .frame(maxWidth: 52)
            } minimal: {
                ProgressView(
                    timerInterval: context.state.timerRange,
                    countsDown: true,
                    label: { EmptyView() },
                    currentValueLabel: { EmptyView() }
                )
                .progressViewStyle(.circular)
                .tint(context.attributes.mode.tint)
            }
            .keylineTint(context.attributes.mode.tint)
        }
    }
}

/// The system-driven countdown, in one place so the Lock Screen and both Island
/// presentations can't drift apart. `pauseTime` is what freezes it — there is no
/// "paused" variant to render, the same view handles both.
private struct TimerText: View {
    let state: FocusActivityAttributes.ContentState
    let size: CGFloat

    var body: some View {
        Text(
            timerInterval: state.timerRange,
            pauseTime: state.pausedAt,
            countsDown: true,
            showsHours: state.timerRange.upperBound.timeIntervalSince(state.timerRange.lowerBound) >= 3600
        )
        .font(.system(size: size, weight: .semibold, design: .rounded))
        .monospacedDigit()
    }
}
