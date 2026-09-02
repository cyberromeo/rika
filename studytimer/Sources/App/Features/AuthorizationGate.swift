import FamilyControls
import SwiftUI

/// Authorization prompt and the failure states behind it.
///
/// Worth the detail because every failure mode here is unfixable from inside the
/// app and each needs a different action from the user: a declined prompt can be
/// retried, an ineligible account can't, and the Simulator will never work at all.
/// A single "something went wrong" would leave them stuck.
struct AuthorizationGate: View {
    @Environment(AuthorizationService.self) private var auth

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "lock.shield")
                .font(.system(size: 40, weight: .light))
                .foregroundStyle(Theme.blue)

            VStack(spacing: 8) {
                Text("Screen Time access")
                    .font(.system(size: 19, weight: .semibold, design: .rounded))
                    .foregroundStyle(Theme.primaryText)

                Text("Blocking apps during a session needs Apple's Screen Time permission. Lock In only ever uses it to shield the apps you choose, while a session is running.")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.secondaryText)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let failure = auth.lastFailure {
                Text(failure.errorDescription ?? "")
                    .font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(Theme.amber)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(12)
                    .background {
                        RoundedRectangle(cornerRadius: 12).fill(Theme.amber.opacity(0.1))
                    }
            }

            Button {
                Task { await auth.request() }
            } label: {
                Group {
                    if auth.isRequesting {
                        ProgressView().tint(.white)
                    } else {
                        Text(auth.lastFailure == nil ? "Allow Screen Time access" : "Try again")
                            .font(.system(size: 15, weight: .semibold))
                    }
                }
                .frame(height: 50)
                .frame(maxWidth: .infinity)
                .contentShape(.capsule)
            }
            .buttonStyle(.glassProminent)
            .tint(Theme.blue)
            .disabled(auth.isRequesting || auth.lastFailure == .ineligibleAccount)

            Text("You'll be asked for your Screen Time passcode.")
                .font(.system(size: 11))
                .foregroundStyle(Theme.tertiaryText)
        }
        .padding(24)
        .background {
            RoundedRectangle(cornerRadius: 22)
                .fill(Theme.surface)
                .overlay {
                    RoundedRectangle(cornerRadius: 22).stroke(Theme.surfaceBorder, lineWidth: 1)
                }
        }
    }
}
