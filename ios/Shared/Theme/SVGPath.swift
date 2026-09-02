import SwiftUI

/// A parser for the subset of SVG path syntax the body heat map uses.
///
/// The 21 muscle regions in `src/components/BodyHeatMap.tsx` are authored as `d`
/// strings in a 120×300 viewBox. Hand-converting 21 bézier outlines to
/// `Path` calls would be error-prone and would leave the two clients unable to
/// diff, so the strings are carried over verbatim and parsed here.
///
/// Supported commands: `M`/`m`, `L`/`l`, `C`/`c`, `Z`/`z` — which is everything
/// the authored data contains. Anything else is skipped rather than throwing: a
/// missing region is a cosmetic bug, a crash is not.
enum SVGPath {

    /// Parses `d` into a `Path`, mapping the source viewBox onto `rect`.
    static func path(_ d: String, viewBox: CGSize, in rect: CGRect) -> Path {
        let scale = min(rect.width / viewBox.width, rect.height / viewBox.height)
        let offsetX = rect.minX + (rect.width - viewBox.width * scale) / 2
        let offsetY = rect.minY + (rect.height - viewBox.height * scale) / 2

        func map(_ point: CGPoint) -> CGPoint {
            CGPoint(x: offsetX + point.x * scale, y: offsetY + point.y * scale)
        }

        var path = Path()
        var current = CGPoint.zero
        var subpathStart = CGPoint.zero

        for token in tokenize(d) {
            switch token.command {
            case "M", "m":
                // A moveto with extra coordinate pairs implies lineto for the rest.
                var isFirst = true
                for pair in token.pairs {
                    let point = token.isRelative
                        ? CGPoint(x: current.x + pair.x, y: current.y + pair.y)
                        : pair
                    if isFirst {
                        path.move(to: map(point))
                        subpathStart = point
                        isFirst = false
                    } else {
                        path.addLine(to: map(point))
                    }
                    current = point
                }

            case "L", "l":
                for pair in token.pairs {
                    let point = token.isRelative
                        ? CGPoint(x: current.x + pair.x, y: current.y + pair.y)
                        : pair
                    path.addLine(to: map(point))
                    current = point
                }

            case "C", "c":
                // Curves come in triples: two control points and an endpoint.
                var index = 0
                while index + 2 < token.pairs.count {
                    let raw = Array(token.pairs[index...(index + 2)])
                    let points = token.isRelative
                        ? raw.map { CGPoint(x: current.x + $0.x, y: current.y + $0.y) }
                        : raw
                    path.addCurve(
                        to: map(points[2]),
                        control1: map(points[0]),
                        control2: map(points[1])
                    )
                    current = points[2]
                    index += 3
                }

            case "Z", "z":
                path.closeSubpath()
                current = subpathStart

            default:
                continue
            }
        }

        return path
    }

    // ── Tokenizer ───────────────────────────────────────────────────────────

    private struct Token {
        let command: Character
        let pairs: [CGPoint]

        var isRelative: Bool { command.isLowercase }
    }

    private static let commands: Set<Character> = ["M", "m", "L", "l", "C", "c", "Z", "z"]

    private static func tokenize(_ d: String) -> [Token] {
        var tokens: [Token] = []
        var command: Character?
        var numbers: [Double] = []
        var buffer = ""

        func flushNumber() {
            if !buffer.isEmpty {
                if let value = Double(buffer) { numbers.append(value) }
                buffer = ""
            }
        }

        func flushCommand() {
            guard let command else { return }
            flushNumber()
            var pairs: [CGPoint] = []
            var index = 0
            while index + 1 < numbers.count {
                pairs.append(CGPoint(x: numbers[index], y: numbers[index + 1]))
                index += 2
            }
            tokens.append(Token(command: command, pairs: pairs))
            numbers = []
        }

        for char in d {
            if commands.contains(char) {
                flushCommand()
                command = char
            } else if char == "-" && !buffer.isEmpty && buffer.last != "e" && buffer.last != "E" {
                // A minus that is not an exponent sign starts the next number.
                flushNumber()
                buffer = "-"
            } else if char.isNumber || char == "." || char == "-" || char == "e" || char == "E" {
                buffer.append(char)
            } else {
                // Whitespace or comma.
                flushNumber()
            }
        }
        flushCommand()

        return tokens
    }
}
