import Foundation
import CoreGraphics

/// A muscle region on one of the two figures.
///
/// `pair` regions are authored once for the left half and drawn a second time
/// mirrored, so both sides always shade identically and there is only one copy of
/// each path to maintain. `center` regions straddle the spine and are drawn once.
struct BodyRegion: Identifiable, Sendable {
    enum Kind: Sendable { case pair, center }

    let muscle: String
    let d: String
    let kind: Kind

    var id: String { muscle + d.prefix(8) }
    var label: String { Muscle.label(muscle) }
}

/// Figure geometry, in a 120×300 viewBox with the spine at x=60.
/// y bands: head 6–38 · shoulders 48 · waist 100 · hips 130 · knees 210 · feet 288
///
/// Transcribed verbatim from src/components/BodyHeatMap.tsx so the two clients
/// stay diffable.
enum BodyFigure {

    static let viewBox = CGSize(width: 120, height: 300)

    /// Head, drawn as an ellipse rather than a path.
    static let head = (cx: 60.0, cy: 22.0, rx: 13.0, ry: 16.5)

    static let outlinePair = [
        // Arm: shoulder cap down to the hand.
        "M35 48 C28 51 24 58 23 68 C22 80 21 92 20 104 C19 116 17 132 15 148 C15 155 14 160 14 163 C18 166 23 166 26 163 C27 155 28 146 30 134 C31 122 33 110 34 100 C35 88 35 74 36 62 C36 55 36 50 35 48 Z",
        // Leg: hip down to the foot.
        "M33 130 C30 142 29 156 30 172 C31 186 33 198 35 210 C36 222 37 234 38 246 C39 256 40 264 41 272 C40 278 40 284 41 288 C46 290 53 290 56 288 C57 280 57 270 57 260 C57 248 57 236 56 224 C56 212 57 200 58 188 C59 174 59 152 58 132 C50 136 40 135 33 130 Z",
    ]

    static let outlineCenter = [
        // Neck.
        "M53 34 L53 44 C56 47 64 47 67 44 L67 34 Z",
        // Torso.
        "M52 42 C45 43 39 46 35 50 C32 58 31 66 32 74 C33 84 34 92 33 100 C32 110 32 120 33 130 C40 135 50 137 60 137 C70 137 80 135 87 130 C88 120 88 110 87 100 C86 92 87 84 88 74 C89 66 88 58 85 50 C81 46 75 43 68 42 C65 45 60 46 60 46 C60 46 55 45 52 42 Z",
    ]

    /// Abs striations + spine — drawn over the fills as detail, never interactive.
    static let frontDetail = [
        "M60 84 L60 124", "M49 96 L71 96", "M48 108 L72 108", "M50 118 L70 118",
    ]

    static let backDetail = ["M60 84 L60 140"]

    // ── Front ───────────────────────────────────────────────────────────────

    static let frontRegions: [BodyRegion] = [
        BodyRegion(muscle: "traps", d: "M53 43 C46 44 40 47 36 51 C42 52 48 50 53 47 Z", kind: .pair),
        BodyRegion(muscle: "shoulders", d: "M36 49 C29 52 24 59 23 69 C27 73 32 73 35 70 C36 63 36 55 36 49 Z", kind: .pair),
        BodyRegion(muscle: "chest", d: "M58 50 C50 50 42 52 37 56 C36 64 37 72 39 78 C45 82 53 82 58 78 C59 68 59 58 58 50 Z", kind: .pair),
        BodyRegion(muscle: "biceps", d: "M24 70 C22 80 21 90 21 101 C24 107 29 109 33 106 C34 94 34 82 34 70 C31 66 27 66 24 70 Z", kind: .pair),
        BodyRegion(muscle: "forearms", d: "M21 108 C19 120 17 133 15 146 C14 153 14 158 14 162 C18 165 23 164 26 161 C27 150 29 136 30 122 C31 116 31 111 31 108 C28 110 24 110 21 108 Z", kind: .pair),
        BodyRegion(muscle: "abs", d: "M51 84 C47 92 46 105 47 117 C51 123 56 126 60 126 C64 126 69 123 73 117 C74 105 73 92 69 84 C64 82 56 82 51 84 Z", kind: .center),
        BodyRegion(muscle: "obliques", d: "M49 86 C44 90 41 98 41 108 C42 116 44 122 47 126 C49 120 48 108 49 98 Z", kind: .pair),
        BodyRegion(muscle: "hipFlexors", d: "M49 128 C45 132 43 138 43 144 C48 146 54 145 58 142 C57 136 54 130 49 128 Z", kind: .pair),
        BodyRegion(muscle: "abductors", d: "M38 130 C33 134 31 142 31 152 C32 160 34 166 37 170 C39 160 39 148 40 138 Z", kind: .pair),
        BodyRegion(muscle: "quads", d: "M39 146 C35 154 33 168 34 182 C35 194 38 202 42 208 C49 206 53 200 55 192 C56 178 55 162 53 150 C49 146 44 145 39 146 Z", kind: .pair),
        BodyRegion(muscle: "adductors", d: "M55 146 C51 152 50 164 51 176 C53 184 56 188 58 190 C59 180 59 164 59 150 Z", kind: .pair),
        BodyRegion(muscle: "tibialisAnterior", d: "M43 218 C40 226 39 238 40 250 C41 258 43 264 45 268 C48 266 50 260 50 252 C50 240 48 228 46 220 Z", kind: .pair),
    ]

    // ── Back ────────────────────────────────────────────────────────────────

    static let backRegions: [BodyRegion] = [
        BodyRegion(muscle: "traps", d: "M52 42 C44 45 38 49 34 53 C42 58 49 64 54 72 C57 76 59 80 60 84 C61 80 63 76 66 72 C71 64 78 58 86 53 C82 49 76 45 68 42 C65 46 60 47 60 47 C60 47 55 46 52 42 Z", kind: .center),
        BodyRegion(muscle: "shoulders", d: "M36 49 C29 52 24 59 23 69 C27 73 32 73 35 70 C36 63 36 55 36 49 Z", kind: .pair),
        BodyRegion(muscle: "lats", d: "M36 60 C34 72 34 86 37 98 C41 108 48 116 55 122 C58 114 58 102 56 92 C53 78 46 66 38 60 Z", kind: .pair),
        BodyRegion(muscle: "triceps", d: "M24 70 C22 80 21 90 21 101 C24 107 29 109 33 106 C34 94 34 82 34 70 C31 66 27 66 24 70 Z", kind: .pair),
        BodyRegion(muscle: "forearms", d: "M21 108 C19 120 17 133 15 146 C14 153 14 158 14 162 C18 165 23 164 26 161 C27 150 29 136 30 122 C31 116 31 111 31 108 C28 110 24 110 21 108 Z", kind: .pair),
        BodyRegion(muscle: "lowerBack", d: "M51 120 C48 126 47 133 48 140 C53 143 67 143 72 140 C73 133 72 126 69 120 C64 123 56 123 51 120 Z", kind: .center),
        BodyRegion(muscle: "glutes", d: "M44 140 C38 144 34 152 34 161 C35 169 40 175 47 177 C53 177 57 173 58 167 C59 158 58 148 56 142 C52 140 48 139 44 140 Z", kind: .pair),
        BodyRegion(muscle: "hamstrings", d: "M39 180 C36 190 35 200 36 210 C38 218 41 224 45 228 C50 226 53 220 54 212 C55 200 54 190 52 182 C48 179 43 178 39 180 Z", kind: .pair),
        BodyRegion(muscle: "calves", d: "M41 232 C38 240 37 250 38 258 C40 266 43 270 46 272 C50 270 52 264 52 256 C52 246 50 238 48 232 Z", kind: .pair),
    ]
}
