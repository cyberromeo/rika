import Foundation

/// Recovery bands for a muscle, ported from `recoveryTier` in `src/api/motra.ts`.
/// The boundaries matter: they drive both the heat-map fill and the chip colour,
/// and they are inclusive at the lower edge (75 is `nearly`, not `sore`).
enum RecoveryTier: String, CaseIterable, Codable, Sendable {
    case fatigued   // < 50
    case sore       // 50 … 74
    case nearly     // 75 … 99
    case ready      // 100

    init(recovery: Int) {
        switch recovery {
        case 100...: self = .ready
        case 75...: self = .nearly
        case 50...: self = .sore
        default: self = .fatigued
        }
    }

    var label: String {
        switch self {
        case .fatigued: return "Fatigued"
        case .sore: return "Sore"
        case .nearly: return "Nearly ready"
        case .ready: return "Ready"
        }
    }
}
