import SwiftUI

// ─── Card surface ───────────────────────────────────────────────────────────
//
// `--surface-1` in CSS terms: one gradient wash, one hairline border, one inset
// top sheen. Deliberately NOT `.glassEffect()` — Liquid Glass belongs to the
// navigation layer, and painting it on every card would put a CABackdropLayer
// (three offscreen textures) behind each of the ~20 surfaces a screen carries.
//
// `--surface-shadow` is dropped: three shadow layers that are invisible against
// #000 and cost a blur pass each.

struct CardSurface: ViewModifier {
    var padding: CGFloat = Metrics.cardPadding
    var radius: CGFloat = Metrics.radiusLarge
    var active: Bool = false

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(active ? Palette.surfaceGradientActive : Palette.surfaceGradient)
            .clipShape(.rect(cornerRadius: radius))
            .overlay {
                RoundedRectangle(cornerRadius: radius)
                    .strokeBorder(Palette.surfaceBorder, lineWidth: 1)
            }
            .overlay(alignment: .top) {
                // The hairline highlight along the top edge — the one detail
                // that reads as "glass" on an OLED black background.
                Rectangle()
                    .fill(Palette.surfaceSheen)
                    .frame(height: 1)
                    .padding(.horizontal, radius / 2)
                    .allowsHitTesting(false)
            }
    }
}

extension View {
    /// The app's single raised-surface recipe.
    func card(
        padding: CGFloat = Metrics.cardPadding,
        radius: CGFloat = Metrics.radiusLarge,
        active: Bool = false
    ) -> some View {
        modifier(CardSurface(padding: padding, radius: radius, active: active))
    }

    /// A card that behaves as a button: the whole surface is tappable, and it
    /// dims to `--surface-1-active` while pressed.
    func cardButton(action: @escaping () -> Void) -> some View {
        Button(action: action) { self }
            .buttonStyle(CardButtonStyle())
    }

    /// Standard page gutter (`--page-inset`).
    func pageInset() -> some View {
        padding(.horizontal, Metrics.pageInset)
    }
}

struct CardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .card(active: configuration.isPressed)
            .contentShape(.rect(cornerRadius: Metrics.radiusLarge))
            .animation(.easeOut(duration: 0.18), value: configuration.isPressed)
    }
}

// ─── Progress ring ──────────────────────────────────────────────────────────

/// The ring used by every percentage in the app — AI usage tiles, FMGE
/// progress, gym recovery. The web version draws an SVG circle with
/// `strokeDasharray` over a 36×36 viewBox; this is the same thing with a real
/// trim.
struct ProgressRing: View {
    var progress: Double            // 0…1
    var tint: Color
    var lineWidth: CGFloat = 3.5
    var track: Color = Palette.trackFill

    var body: some View {
        ZStack {
            Circle()
                .stroke(track, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: max(0, min(1, progress)))
                .stroke(tint, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

// ─── Bars ───────────────────────────────────────────────────────────────────

/// Horizontal progress bar (`.summary-bar-bg` / `.subject-progress-bg`).
struct ProgressBar: View {
    var progress: Double            // 0…1
    var tint: Color
    var height: CGFloat = 6

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.trackFill)
                Capsule()
                    .fill(tint)
                    .frame(width: geo.size.width * max(0, min(1, progress)))
            }
        }
        .frame(height: height)
    }
}
