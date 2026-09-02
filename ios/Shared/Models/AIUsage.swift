import Foundation

/// One OpenCode usage window.
struct UsageStat: Codable, Hashable, Sendable {
    var status: String = "ok"
    var resetInSec: Int = 0
    var usagePercent: Int = 0

    enum CodingKeys: String, CodingKey { case status, resetInSec, usagePercent }

    init(status: String = "ok", resetInSec: Int = 0, usagePercent: Int = 0) {
        self.status = status
        self.resetInSec = resetInSec
        self.usagePercent = usagePercent
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        status = c.flexString(.status, default: "ok")
        resetInSec = c.flexInt(.resetInSec)
        usagePercent = c.flexInt(.usagePercent)
    }

    /// Thresholds from `severityFor` (AiUsageWidget.tsx:42).
    var severity: UsageSeverity {
        if status == "rate-limited" || usagePercent >= 100 { return .critical }
        if usagePercent > 80 { return .warn }
        return .ok
    }

    var resetLabel: String { DateDisplay.compactDuration(resetInSec) }
}

enum UsageSeverity: String, Comparable, Sendable {
    case ok, warn, critical

    private var rank: Int {
        switch self {
        case .ok: return 0
        case .warn: return 1
        case .critical: return 2
        }
    }

    static func < (lhs: UsageSeverity, rhs: UsageSeverity) -> Bool { lhs.rank < rhs.rank }
}

/// The `/api/ai-usage` payload: three windows plus a partial-failure list.
struct AIUsage: Codable, Hashable, Sendable {
    var rollingUsage: UsageStat?
    var weeklyUsage: UsageStat?
    var monthlyUsage: UsageStat?

    var isEmpty: Bool {
        rollingUsage == nil && weeklyUsage == nil && monthlyUsage == nil
    }

    /// The three tiles, in the order the widget lays them out.
    var tiles: [(short: String, label: String, stat: UsageStat)] {
        var out: [(String, String, UsageStat)] = []
        if let rollingUsage { out.append(("5Hr", "OpenCode 5Hr", rollingUsage)) }
        if let weeklyUsage { out.append(("Wk", "OpenCode Weekly", weeklyUsage)) }
        if let monthlyUsage { out.append(("Mo", "OpenCode Monthly", monthlyUsage)) }
        return out
    }

    /// Worst severity across the visible windows — drives the header dot.
    var overallSeverity: UsageSeverity {
        tiles.map(\.stat.severity).max() ?? .ok
    }
}
