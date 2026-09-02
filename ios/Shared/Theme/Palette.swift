import SwiftUI

/// Colour tokens, transcribed from the `:root` block in `src/index.css`.
/// Names follow the CSS custom properties so the two stay comparable.
enum Palette {

    // ── Base (pitch black, OLED) ────────────────────────────────────────────
    /// `--tg-theme-bg-color`
    static let bg = Color.black
    /// `--tg-theme-secondary-bg-color`
    static let bgSecondary = Color(hex: 0x0A0A0A)
    /// `--tg-theme-text-color`
    static let text = Color(hex: 0xF5F5F7)
    /// `--tg-theme-hint-color` — also the subtitle and section-header colour
    static let hint = Color(hex: 0x6E6E73)

    // ── Accents, named by meaning rather than by page ────────────────────────
    /// `--accent-blue`
    static let blue = Color(hex: 0x0A84FF)
    /// `--accent-green`
    static let green = Color(hex: 0x30D158)
    /// `--accent-orange`
    static let orange = Color(hex: 0xFF9F0A)
    /// `--accent-red`
    static let red = Color(hex: 0xFF453A)

    // ── Task priorities (`--priority-p1` … `--priority-p4`) ──────────────────
    static let p1 = red
    static let p2 = orange
    static let p3 = blue
    static let p4 = Color(hex: 0x48484A)

    // ── Card surface (`--surface-*`) ─────────────────────────────────────────
    /// `--surface-1`: a 180° wash from 5.5% to 2.2% white.
    static let surfaceGradient = LinearGradient(
        colors: [Color.white.opacity(0.055), Color.white.opacity(0.022)],
        startPoint: .top,
        endPoint: .bottom
    )
    /// `--surface-1-active`
    static let surfaceGradientActive = LinearGradient(
        colors: [Color.white.opacity(0.085), Color.white.opacity(0.040)],
        startPoint: .top,
        endPoint: .bottom
    )
    /// `--surface-border`
    static let surfaceBorder = Color.white.opacity(0.09)
    /// `--surface-border-strong`
    static let surfaceBorderStrong = Color.white.opacity(0.14)
    /// `--surface-sheen`: the hairline top highlight that reads as glass on black.
    static let surfaceSheen = Color.white.opacity(0.07)

    /// Track colour behind every progress ring and bar (`.ring-bg`).
    static let trackFill = Color.white.opacity(0.08)

    // ── Recovery tiers (Motra heat map + chips) ──────────────────────────────
    static func tier(_ tier: RecoveryTier) -> Color {
        switch tier {
        case .fatigued: return red
        case .sore: return orange
        case .nearly: return Color(hex: 0xFFD60A)
        case .ready: return green
        }
    }
}

// ── Metrics (`--radius-*`, `--card-pad`, `--page-inset`) ────────────────────

enum Metrics {
    static let radiusSmall: CGFloat = 10
    static let radiusMedium: CGFloat = 14
    static let radiusLarge: CGFloat = 22
    static let cardPadding: CGFloat = 16
    /// `--page-inset`: the single horizontal gutter every page uses.
    static let pageInset: CGFloat = 20
    static let cardSpacing: CGFloat = 12
}

extension Color {
    /// `Color(hex: 0x0A84FF)` — matches how the CSS tokens are written.
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}
