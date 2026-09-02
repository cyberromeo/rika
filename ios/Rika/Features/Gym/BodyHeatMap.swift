import SwiftUI

/// Port of src/components/BodyHeatMap.tsx — two figures, 18 tappable muscles,
/// shaded by recovery tier with fatigue driving opacity.
///
/// Drawn with `Canvas` rather than a stack of `Path` views: 21 regions × 2
/// figures, each drawn twice for mirroring, is ~60 shapes. As SwiftUI views that
/// is 60 live subtrees to lay out; in a `Canvas` it is one draw pass. Hit testing
/// is done separately against the same parsed paths.
struct BodyHeatMap: View {

    let muscles: [String: MuscleRecovery]
    @Binding var selectedMuscle: String?

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                figure(regions: BodyFigure.frontRegions, detail: BodyFigure.frontDetail, caption: "Front")
                figure(regions: BodyFigure.backRegions, detail: BodyFigure.backDetail, caption: "Back")
            }
            legend
        }
    }

    // ── One figure ──────────────────────────────────────────────────────────

    private func figure(regions: [BodyRegion], detail: [String], caption: String) -> some View {
        VStack(spacing: 4) {
            GeometryReader { geo in
                let rect = CGRect(origin: .zero, size: geo.size)

                Canvas { context, _ in
                    drawOutline(in: &context, rect: rect)
                    drawRegions(regions, in: &context, rect: rect)
                    drawDetail(detail, in: &context, rect: rect)
                }
                .contentShape(.rect)
                .gesture(
                    // SpatialTapGesture is the current way to get a tap's
                    // location; the location-carrying onTapGesture overload is
                    // deprecated.
                    SpatialTapGesture()
                        .onEnded { value in
                            if let hit = muscle(at: value.location, in: regions, rect: rect) {
                                Haptics.light()
                                selectedMuscle = selectedMuscle == hit ? nil : hit
                            }
                        }
                )
            }
            .aspectRatio(BodyFigure.viewBox.width / BodyFigure.viewBox.height, contentMode: .fit)

            Text(caption).eyebrow()
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement()
        .accessibilityLabel("\(caption) muscle recovery")
    }

    // ── Drawing ─────────────────────────────────────────────────────────────

    private func drawOutline(in context: inout GraphicsContext, rect: CGRect) {
        let fill = GraphicsContext.Shading.color(Color.white.opacity(0.05))
        let stroke = GraphicsContext.Shading.color(Color.white.opacity(0.10))

        // Head.
        let scale = min(rect.width / BodyFigure.viewBox.width, rect.height / BodyFigure.viewBox.height)
        let head = BodyFigure.head
        let headRect = CGRect(
            x: (head.cx - head.rx) * scale,
            y: (head.cy - head.ry) * scale,
            width: head.rx * 2 * scale,
            height: head.ry * 2 * scale
        )
        context.fill(Path(ellipseIn: headRect), with: fill)
        context.stroke(Path(ellipseIn: headRect), with: stroke, lineWidth: 0.8)

        for d in BodyFigure.outlineCenter {
            let path = parse(d, rect: rect)
            context.fill(path, with: fill)
            context.stroke(path, with: stroke, lineWidth: 0.8)
        }

        for d in BodyFigure.outlinePair {
            for path in [parse(d, rect: rect), parse(d, rect: rect, mirrored: true)] {
                context.fill(path, with: fill)
                context.stroke(path, with: stroke, lineWidth: 0.8)
            }
        }
    }

    private func drawRegions(
        _ regions: [BodyRegion],
        in context: inout GraphicsContext,
        rect: CGRect
    ) {
        for region in regions {
            let data = muscles[region.muscle] ?? .fullyRecovered
            let tint = Palette.tier(data.tier)
            let isSelected = selectedMuscle == region.muscle
            let shading = GraphicsContext.Shading.color(tint.opacity(data.fillOpacity))

            var paths = [parse(region.d, rect: rect)]
            if region.kind == .pair {
                paths.append(parse(region.d, rect: rect, mirrored: true))
            }

            for path in paths {
                context.fill(path, with: shading)
                if isSelected {
                    context.stroke(
                        path,
                        with: .color(Palette.text.opacity(0.9)),
                        lineWidth: 1.2
                    )
                }
            }
        }
    }

    private func drawDetail(_ detail: [String], in context: inout GraphicsContext, rect: CGRect) {
        for d in detail {
            context.stroke(
                parse(d, rect: rect),
                with: .color(Color.black.opacity(0.35)),
                lineWidth: 0.7
            )
        }
    }

    // ── Geometry ────────────────────────────────────────────────────────────

    private func parse(_ d: String, rect: CGRect, mirrored: Bool = false) -> Path {
        let path = SVGPath.path(d, viewBox: BodyFigure.viewBox, in: rect)
        guard mirrored else { return path }
        // `translate(120,0) scale(-1,1)` in the source SVG.
        return path.applying(
            CGAffineTransform(scaleX: -1, y: 1).concatenating(
                CGAffineTransform(translationX: rect.width, y: 0)
            )
        )
    }

    /// Which muscle a tap landed on. Regions are tested in reverse draw order so
    /// the topmost one wins, matching how the SVG version resolves overlaps.
    private func muscle(at point: CGPoint, in regions: [BodyRegion], rect: CGRect) -> String? {
        for region in regions.reversed() {
            if parse(region.d, rect: rect).contains(point) { return region.muscle }
            if region.kind == .pair,
               parse(region.d, rect: rect, mirrored: true).contains(point) {
                return region.muscle
            }
        }
        return nil
    }

    // ── Legend ──────────────────────────────────────────────────────────────

    private var legend: some View {
        VStack(spacing: 3) {
            LinearGradient(
                colors: [Palette.red, Palette.orange, Color(hex: 0xFFD60A), Palette.green],
                startPoint: .leading,
                endPoint: .trailing
            )
            .frame(height: 4)
            .clipShape(.capsule)

            HStack {
                Text("Fatigued").eyebrow()
                Spacer()
                Text("Recovered").eyebrow()
            }
        }
    }
}
