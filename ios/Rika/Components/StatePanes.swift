import SwiftUI

/// `.loading-state` — spinner plus a line of context.
struct LoadingPane: View {
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
                .controlSize(.large)
            Text(message)
                .font(Typo.label)
                .foregroundStyle(Palette.hint)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(40)
    }
}

/// `.error-state` — what went wrong, and a way to try again.
struct ErrorPane: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 30, weight: .light))
                .foregroundStyle(Palette.orange)
            Text("Couldn't load")
                .font(Typo.title)
                .foregroundStyle(Palette.text)
            Text(message)
                .font(Typo.label)
                .foregroundStyle(Palette.hint)
                .multilineTextAlignment(.center)
            Button("Try Again") {
                Haptics.light()
                retry()
            }
            .buttonStyle(.glassProminent)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(32)
    }
}

/// `.empty-state` — nothing here yet, and why that is fine.
struct EmptyPane: View {
    let symbol: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 34, weight: .ultraLight))
                .foregroundStyle(Palette.hint)
            Text(title)
                .font(Typo.title)
                .foregroundStyle(Palette.text)
            Text(message)
                .font(Typo.label)
                .foregroundStyle(Palette.hint)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 44)
    }
}

/// A one-line "showing cached data" note, used where a fetch failed but the
/// screen still has something to show.
struct StaleBanner: View {
    let message: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 11, weight: .semibold))
            Text(message)
                .font(Typo.micro)
        }
        .foregroundStyle(Palette.orange)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(
            RoundedRectangle(cornerRadius: Metrics.radiusSmall)
                .fill(Palette.orange.opacity(0.10))
        )
    }
}
