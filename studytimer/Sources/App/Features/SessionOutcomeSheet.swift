import SwiftUI

/// Shown once a session ends. Brief and non-judgemental for a completed session;
/// honest without being punitive for an abandoned one — the app's job is to make
/// quitting slightly hard, not to make the user feel bad afterwards.
struct SessionOutcomeSheet: View {
    let outcome: SessionEngine.Outcome
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: outcome.wasCompleted ? "checkmark.circle.fill" : "arrow.uturn.left.circle.fill")
                .font(.system(size: 46))
                .foregroundStyle(outcome.wasCompleted ? outcome.mode.tint : Theme.secondaryText)
                .symbolEffect(.bounce, value: outcome.id)

            VStack(spacing: 6) {
                Text(outcome.wasCompleted ? "Session complete" : "Ended early")
                    .font(.system(size: 21, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.primaryText)

                Text(detail)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.secondaryText)
                    .multilineTextAlignment(.center)
            }

            if outcome.brokeStreak {
                Text("Streak reset")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.red)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Theme.red.opacity(0.12)))
            }

            Button("Done", action: onDismiss)
                .buttonStyle(.glassProminent)
                .tint(outcome.mode.tint)
                .frame(maxWidth: .infinity)
        }
        .padding(28)
        .presentationDetents([.height(340)])
    }

    private var detail: String {
        let logged = TimeFormatting.compact(outcome.focusedSeconds)
        return outcome.wasCompleted
            ? "\(logged) of \(outcome.mode.title.lowercased()) logged. Apps are unblocked."
            : "\(logged) still counted. Apps are unblocked."
    }
}

/// Inline, dismissible explanation for the one case where starting a session can't
/// do everything the user expects — a session too short for iOS to guarantee it
/// would unblock again.
struct WarningBanner: View {
    let text: String
    let onDismiss: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.amber)
                .padding(.top, 1)

            Text(text)
                .font(.system(size: 12))
                .foregroundStyle(Theme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Theme.tertiaryText)
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background {
            RoundedRectangle(cornerRadius: 14)
                .fill(Theme.surface)
                .overlay {
                    RoundedRectangle(cornerRadius: 14).stroke(Theme.surfaceBorder, lineWidth: 1)
                }
        }
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}
