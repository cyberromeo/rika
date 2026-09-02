import SwiftUI

/// The type ramp from `src/index.css` (`--text-*`, `--tracking-*`).
///
/// The CSS comment on that block is the reason this exists as a named ramp
/// rather than inline sizes: the same "card title" role had drifted to 13px/700
/// in one widget and 15px/600 in another. One role, one value.
enum Typo {

    /// `--text-title` — card titles.
    static let title = Font.system(size: 15, weight: .semibold)
    /// `--text-body`
    static let body = Font.system(size: 14, weight: .regular)
    /// `--text-label` — stat labels and chips.
    static let label = Font.system(size: 12, weight: .medium)
    /// `--text-micro` — uppercase eyebrows.
    static let micro = Font.system(size: 11, weight: .semibold)

    /// Page `<h1>`.
    static let pageTitle = Font.system(size: 28, weight: .bold)
    /// Page subtitle under the h1.
    static let pageSubtitle = Font.system(size: 14, weight: .regular)

    /// Large numerals — ring percentages, countdown digits, timer readout.
    /// Rounded design keeps digits legible at small sizes on black.
    static func numeral(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }

    /// Monospaced digits for anything that ticks, so the layout does not jitter
    /// as the glyph widths change.
    static func ticking(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight, design: .rounded).monospacedDigit()
    }

    // `--tracking-tight` / `--tracking-wide`
    static let trackingTight: CGFloat = -0.24
    static let trackingWide: CGFloat = 0.32
}

extension View {
    /// An uppercase micro label with the wide tracking the CSS applies to
    /// `.stat-label`, `.gym-week-lbl` and friends.
    func eyebrow() -> some View {
        font(Typo.micro)
            .textCase(.uppercase)
            .tracking(Typo.trackingWide)
            .foregroundStyle(Palette.hint)
    }

    /// A card title: `--text-title` with optical tightening.
    func cardTitle() -> some View {
        font(Typo.title)
            .tracking(Typo.trackingTight)
            .foregroundStyle(Palette.text)
    }
}
