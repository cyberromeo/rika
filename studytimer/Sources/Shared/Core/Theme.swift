import SwiftUI

/// Design tokens.
///
/// Carried over from the web app's CSS custom properties (`src/index.css`) so the
/// two surfaces read as one product. The load-bearing rule from there, worth
/// restating because it's easy to break: **accent colour lives in content — rings,
/// numbers, chips — never in a container.** Containers are black or glass; nothing
/// else. That's what keeps a pitch-black OLED layout from looking like a toy.
public enum Theme {

    // MARK: Surfaces

    public static let background = Color.black
    /// For the rare raised panel that isn't glass. Kept subtle enough to read as a
    /// hairline rather than a grey box.
    public static let surface = Color.white.opacity(0.055)
    public static let surfaceBorder = Color.white.opacity(0.09)
    public static let hairline = Color.white.opacity(0.07)

    // MARK: Text

    public static let primaryText = Color(white: 0.96)
    public static let secondaryText = Color(white: 0.62)
    public static let tertiaryText = Color(white: 0.42)

    // MARK: Accents

    public static let blue = Color(red: 0.04, green: 0.52, blue: 1.0)
    public static let green = Color(red: 0.19, green: 0.82, blue: 0.35)
    public static let amber = Color(red: 1.0, green: 0.62, blue: 0.04)
    public static let red = Color(red: 1.0, green: 0.27, blue: 0.23)

    // MARK: Type

    /// Rounded is the right register for a timer — SF Pro Rounded is what Apple
    /// uses for the Clock app's own countdown.
    public static func timerFont(_ size: CGFloat) -> Font {
        .system(size: size, weight: .medium, design: .rounded).monospacedDigit()
    }

    public static let eyebrow = Font.system(size: 11, weight: .semibold).width(.expanded)
    public static let cardTitle = Font.system(size: 15, weight: .semibold)
    public static let label = Font.system(size: 12, weight: .medium)
}

public extension SessionMode {
    /// One accent per mode, used for the ring, the digits and the mode chip — and
    /// nowhere else.
    var tint: Color {
        switch self {
        case .study: Theme.blue
        case .pyq: Theme.amber
        case .rest: Theme.green
        }
    }
}
