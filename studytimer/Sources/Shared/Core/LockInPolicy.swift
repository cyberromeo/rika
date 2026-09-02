import Foundation

/// What bailing out of a session costs.
public struct BailConsequence: Sendable, Equatable {
    /// Whether the partial time still counts toward today's total. Bailing is a
    /// failure of intent, not of work — time spent is usually still time spent.
    public var logsPartialTime: Bool
    /// Whether the streak survives.
    public var breaksStreak: Bool
    /// How long before a new focus session can start.
    public var cooldown: TimeInterval

    public static let free = BailConsequence(logsPartialTime: true, breaksStreak: false, cooldown: 0)

    public init(logsPartialTime: Bool, breaksStreak: Bool, cooldown: TimeInterval) {
        self.logsPartialTime = logsPartialTime
        self.breaksStreak = breaksStreak
        self.cooldown = cooldown
    }
}

/// The friction rules — how hard the app makes it to quit early.
///
/// Deliberately isolated in one small file with no dependencies, because these
/// numbers are a personal calibration rather than an engineering decision: they
/// encode how harsh the app should be on its own user. Everything else in the
/// project reads from here, so tuning happens in one place.
public enum LockInPolicy {

    /// A session bailed inside this window is treated as a mistake rather than a
    /// failure — wrong duration picked, wrong mode, phone grabbed by accident.
    /// No hold, no penalty.
    public static let graceWindow: TimeInterval = 90

    /// Sessions shorter than this can't be shielded reliably: the OS-level safety
    /// valve (`DeviceActivitySchedule`) has a ~15 minute minimum, so anything
    /// briefer depends solely on the app to lift the shield.
    public static let minimumShieldableDuration: TimeInterval = 15 * 60

    /// Padding added past a session's end before the monitor tears the shield down,
    /// so a slightly-late extension callback doesn't unshield early.
    public static let shieldTeardownGrace: TimeInterval = 30

    // MARK: - Your calibration
    //
    // TODO(you): these two functions are the friction curve. The baselines below
    // are placeholders that compile and behave sanely — replace them with what you
    // actually want to hold yourself to.
    //
    // Questions worth answering in the code:
    //   · Should the hold get *longer* the more time is left, so quitting at 55
    //     minutes remaining is harder than at 5? (`fractionRemaining` is there for
    //     it.) Or is a flat, predictable 3 seconds more honest?
    //   · Does bailing break the streak outright, or cost one of a few weekly
    //     tokens — `bailsToday` / `bailsThisWeek` are available for that.
    //   · Is a cooldown after bailing useful pressure, or does it just push you to
    //     the phone you were trying to avoid?

    /// How long "End Session" must be held before it takes effect.
    public static func holdDuration(for session: Session, at now: Date = Date()) -> TimeInterval {
        guard requiresHold(for: session, at: now) else { return 0 }

        // Placeholder: scales 1.5s → 5s with the fraction of the session left.
        let fraction = fractionRemaining(of: session, at: now)
        return 1.5 + (3.5 * fraction)
    }

    /// What ending this session early costs.
    public static func consequence(for session: Session, at now: Date = Date()) -> BailConsequence {
        guard requiresHold(for: session, at: now) else { return .free }

        // Placeholder: work still counts, the streak doesn't survive, no cooldown.
        return BailConsequence(logsPartialTime: true, breaksStreak: true, cooldown: 0)
    }

    // MARK: - Inputs available to the rules above

    /// Breaks are never locked down, and the grace window is always free.
    public static func requiresHold(for session: Session, at now: Date = Date()) -> Bool {
        guard session.mode.isFocus else { return false }
        return session.elapsed(at: now) > graceWindow
    }

    /// 1.0 at the start of a session, 0.0 at the end.
    public static func fractionRemaining(of session: Session, at now: Date = Date()) -> Double {
        guard session.plannedDuration > 0 else { return 0 }
        return min(1, max(0, session.remaining(at: now) / session.plannedDuration))
    }

    public static func bailsToday() -> Int {
        let anchor = StudyDay.anchor()
        guard AppGroup.defaults.string(forKey: StoreKey.lastBailDate) == anchor else { return 0 }
        return AppGroup.defaults.integer(forKey: StoreKey.bailCount)
    }

    public static func recordBail(at now: Date = Date()) {
        let anchor = StudyDay.anchor(for: now)
        let previous = AppGroup.defaults.string(forKey: StoreKey.lastBailDate) == anchor
            ? AppGroup.defaults.integer(forKey: StoreKey.bailCount)
            : 0
        AppGroup.defaults.set(previous + 1, forKey: StoreKey.bailCount)
        AppGroup.defaults.set(anchor, forKey: StoreKey.lastBailDate)
    }

    /// Whether a shield can be trusted to lift itself for a session this long.
    public static func canShield(duration: TimeInterval) -> Bool {
        duration >= minimumShieldableDuration
    }
}
