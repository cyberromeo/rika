import SwiftUI

/// "End session" — the friction made physical.
///
/// A press-and-hold rather than a tap, with the required duration coming from
/// `LockInPolicy` so the harshness lives in one tunable place. Releasing early
/// snaps the fill back, which is the point: quitting should take a deliberate,
/// slightly uncomfortable amount of sustained intent, and abandoning the gesture
/// should feel like changing your mind rather than failing at something.
///
/// Inside the grace window `holdDuration` returns 0 and this degrades to an
/// ordinary button — a session started with the wrong duration shouldn't be a
/// test of character.
struct HoldToEndButton: View {
    let holdDuration: TimeInterval
    let action: () -> Void

    @State private var fill: Double = 0
    @State private var isPressing = false
    @State private var completion: Task<Void, Never>?

    private var requiresHold: Bool { holdDuration > 0 }

    var body: some View {
        ZStack {
            if requiresHold {
                GeometryReader { geo in
                    Capsule()
                        .fill(Theme.red.opacity(0.28))
                        .frame(width: geo.size.width * fill)
                }
            }

            HStack(spacing: 7) {
                Image(systemName: requiresHold && isPressing ? "lock.open.fill" : "stop.fill")
                    .font(.system(size: 13, weight: .bold))
                    .contentTransition(.symbolEffect(.replace))
                Text(label)
                    .font(.system(size: 15, weight: .semibold))
                    .contentTransition(.opacity)
            }
            .foregroundStyle(Theme.primaryText)
        }
        .frame(height: 52)
        .frame(maxWidth: .infinity)
        .glassEffect(.regular.interactive(), in: .capsule)
        .contentShape(.capsule)   // glass area isn't hit-testable on its own
        .scaleEffect(isPressing ? 0.98 : 1)
        .animation(.smooth(duration: 0.18), value: isPressing)
        .gesture(pressGesture)
        .sensoryFeedback(.impact(flexibility: .rigid, intensity: 0.7), trigger: isPressing)
        .accessibilityLabel("End session")
        .accessibilityHint(requiresHold
            ? "Press and hold for \(Int(holdDuration.rounded())) seconds to end early"
            : "Ends the session")
        .accessibilityAddTraits(.isButton)
    }

    private var label: String {
        guard requiresHold else { return "End session" }
        return isPressing ? "Keep holding…" : "Hold to end"
    }

    private var pressGesture: some Gesture {
        // minimumDistance 0 so it triggers on touch-down rather than on movement.
        DragGesture(minimumDistance: 0)
            .onChanged { _ in
                guard !isPressing else { return }
                begin()
            }
            .onEnded { _ in cancel() }
    }

    private func begin() {
        isPressing = true

        guard requiresHold else {
            isPressing = false
            action()
            return
        }

        withAnimation(.linear(duration: holdDuration)) { fill = 1 }
        completion = Task {
            try? await Task.sleep(for: .seconds(holdDuration))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                isPressing = false
                fill = 0
                action()
            }
        }
    }

    private func cancel() {
        completion?.cancel()
        completion = nil
        isPressing = false
        withAnimation(.smooth(duration: 0.25)) { fill = 0 }
    }
}
