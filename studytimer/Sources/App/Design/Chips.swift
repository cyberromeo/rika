import SwiftUI

/// Mode selector. A control, so it's glass — and it sits in the same
/// `GlassEffectContainer` as the duration row and the primary action, because
/// glass can't sample glass and separate containers would render inconsistently.
struct ModeSelector: View {
    @Binding var mode: SessionMode
    var isEnabled: Bool

    var body: some View {
        HStack(spacing: 6) {
            ForEach(SessionMode.allCases, id: \.self) { candidate in
                Button {
                    mode = candidate
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: candidate.symbol)
                            .font(.system(size: 11, weight: .semibold))
                        Text(candidate.title)
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundStyle(mode == candidate ? candidate.tint : Theme.secondaryText)
                    .padding(.vertical, 9)
                    .frame(maxWidth: .infinity)
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .background {
                    if mode == candidate {
                        Capsule().fill(candidate.tint.opacity(0.14))
                    }
                }
            }
        }
        .padding(4)
        .glassEffect(.regular, in: .capsule)
        .opacity(isEnabled ? 1 : 0.4)
        .disabled(!isEnabled)
        .animation(.smooth(duration: 0.25), value: mode)
        .sensoryFeedback(.selection, trigger: mode)
    }
}

/// Duration presets for the selected mode, plus the resulting end time — knowing
/// a session lands at 4:45pm is more useful in the moment than knowing it's 90
/// minutes long.
struct DurationPicker: View {
    let mode: SessionMode
    @Binding var minutes: Int
    var isEnabled: Bool

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                ForEach(mode.presets, id: \.self) { preset in
                    Button {
                        minutes = preset
                    } label: {
                        Text("\(preset)m")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(minutes == preset ? Theme.primaryText : Theme.secondaryText)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 11)
                            .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .background {
                        Capsule()
                            .fill(minutes == preset ? Color.white.opacity(0.12) : Color.clear)
                            .overlay {
                                Capsule().stroke(
                                    minutes == preset ? Color.white.opacity(0.18) : Theme.hairline,
                                    lineWidth: 1
                                )
                            }
                    }
                }
            }

            Text("Ends around \(endTime)")
                .font(.system(size: 12))
                .foregroundStyle(Theme.tertiaryText)
                .contentTransition(.numericText())
        }
        .opacity(isEnabled ? 1 : 0.4)
        .disabled(!isEnabled)
        .animation(.smooth(duration: 0.22), value: minutes)
        .sensoryFeedback(.selection, trigger: minutes)
    }

    private var endTime: String {
        let end = Date().addingTimeInterval(TimeInterval(minutes * 60))
        return end.formatted(date: .omitted, time: .shortened)
    }
}
