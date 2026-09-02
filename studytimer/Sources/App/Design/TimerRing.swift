import SwiftUI

/// The countdown ring.
///
/// Content, not chrome — so no glass here, per the rule in `Theme`. It's drawn on
/// pure black with the mode's accent as the only colour, and a soft bloom behind it
/// that does the work a card background would otherwise do: separating the ring
/// from the void without introducing a visible container.
struct TimerRing: View {
    let progress: Double
    let tint: Color
    /// Dimmed until a session is actually running, so the idle state doesn't look
    /// like a stalled one.
    let isActive: Bool
    let lineWidth: CGFloat

    init(progress: Double, tint: Color, isActive: Bool, lineWidth: CGFloat = 14) {
        self.progress = progress
        self.tint = tint
        self.isActive = isActive
        self.lineWidth = lineWidth
    }

    var body: some View {
        ZStack {
            bloom
            track
            arc
            if isActive { cap }
        }
        .rotationEffect(.degrees(-90))  // start at 12 o'clock
        .animation(.smooth(duration: 0.35), value: progress)
    }

    private var track: some View {
        Circle()
            .stroke(Color.white.opacity(0.07), style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
    }

    private var arc: some View {
        Circle()
            .trim(from: 0, to: max(0.0001, min(1, progress)))
            .stroke(
                AngularGradient(
                    colors: [tint.opacity(0.55), tint, tint.opacity(0.9)],
                    center: .center,
                    startAngle: .degrees(0),
                    endAngle: .degrees(360)
                ),
                style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
            )
            .opacity(isActive ? 1 : 0.35)
            .shadow(color: tint.opacity(isActive ? 0.45 : 0), radius: 12)
    }

    /// A small dot riding the leading edge. Reads as motion even when the arc
    /// itself has barely moved, which matters on a 90-minute session.
    private var cap: some View {
        GeometryReader { geo in
            let radius = (min(geo.size.width, geo.size.height) - lineWidth) / 2
            let angle = Angle.degrees(360 * min(1, max(0, progress)))
            Circle()
                .fill(.white)
                .frame(width: lineWidth * 0.42, height: lineWidth * 0.42)
                .shadow(color: tint.opacity(0.8), radius: 5)
                .offset(x: radius * cos(angle.radians), y: radius * sin(angle.radians))
                .position(x: geo.size.width / 2, y: geo.size.height / 2)
                .opacity(progress > 0.004 ? 1 : 0)
        }
    }

    private var bloom: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [tint.opacity(isActive ? 0.16 : 0.05), .clear],
                    center: .center,
                    startRadius: 0,
                    endRadius: 190
                )
            )
            .blur(radius: 24)
    }
}
