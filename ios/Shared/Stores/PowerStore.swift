import Foundation
import Observation

/// AC power consumption. Port of src/store/powerStore.tsx.
///
/// Three grains are kept as separate `[String: Double]` maps keyed the way each
/// screen looks them up: `YYYY-MM-DD` for daily and for week starts, `YYYY-MM`
/// for months. The calendar asks for a month at a time as the user pages
/// through it, and `fetchedMonths` keeps that from refetching.
@MainActor
@Observable
final class PowerStore {

    private(set) var dailyByDay: [String: Double] = [:]
    private(set) var weeklyByWeekStart: [String: Double] = [:]
    private(set) var monthlyByMonth: [String: Double] = [:]
    private(set) var loading = true
    private(set) var errorMessage: String?

    private var fetchedMonths: Set<String> = []
    private let service = MiraieService.shared

    // ── Loading ─────────────────────────────────────────────────────────────

    func loadAll() async {
        guard AppSecrets.hasMiraie else {
            loading = false
            errorMessage = "MirAIe credentials are not configured"
            restoreFromCache()
            return
        }

        loading = true
        restoreFromCache()

        let now = Date()

        // The three grains are independent; one failing should not blank the
        // other two, so each is caught separately rather than in one do block.
        await withTaskGroup(of: Void.self) { group in
            group.addTask { [weak self] in await self?.loadMonthly(now: now) }
            group.addTask { [weak self] in await self?.loadWeekly(now: now) }
            group.addTask { [weak self] in await self?.loadRecentDaily(now: now) }
        }

        loading = false
    }

    private func loadMonthly(now: Date) async {
        do {
            // The API keeps roughly six months.
            let start = DayKey.adding(months: -6, to: now)
            let entries = try await service.monthly(from: start, to: now)
            merge(entries, into: \.monthlyByMonth)
            AppGroupCache.save(.powerMonthly, monthlyByMonth)
        } catch is CancellationError {
        } catch {
            note(error)
        }
    }

    private func loadWeekly(now: Date) async {
        do {
            let start = DayKey.adding(days: -63, to: now)   // ~9 weeks
            let entries = try await service.weekly(from: start, to: now)
            merge(entries, into: \.weeklyByWeekStart)
            AppGroupCache.save(.powerWeekly, weeklyByWeekStart)
        } catch is CancellationError {
        } catch {
            note(error)
        }
    }

    /// Current month plus the previous one, so "past 7 days" still has data
    /// across a month boundary.
    private func loadRecentDaily(now: Date) async {
        let thisMonth = DayKey.startOfMonth(now)
        let lastMonth = DayKey.startOfMonth(DayKey.adding(months: -1, to: now))
        await loadDaily(monthContaining: thisMonth)
        await loadDaily(monthContaining: lastMonth)
    }

    /// Called by the calendar when the visible month changes.
    func loadMonthIfNeeded(_ date: Date) async {
        await loadDaily(monthContaining: DayKey.startOfMonth(date))
    }

    private func loadDaily(monthContaining monthStart: Date) async {
        let key = DayKey.monthString(from: monthStart)
        guard !fetchedMonths.contains(key) else { return }
        guard AppSecrets.hasMiraie else { return }
        fetchedMonths.insert(key)

        do {
            let entries = try await service.daily(
                from: monthStart,
                to: DayKey.endOfMonth(monthStart)
            )
            merge(entries, into: \.dailyByDay)
            AppGroupCache.save(.powerDaily, dailyByDay)
        } catch is CancellationError {
            fetchedMonths.remove(key)
        } catch {
            // Allow a retry when the user pages back to this month.
            fetchedMonths.remove(key)
            note(error)
        }
    }

    private func merge(_ entries: [PowerEntry], into keyPath: ReferenceWritableKeyPath<PowerStore, [String: Double]>) {
        for entry in entries where !entry.key.isEmpty {
            self[keyPath: keyPath][entry.key] = entry.power
        }
    }

    private func note(_ error: Error) {
        errorMessage = error.localizedDescription
    }

    private func restoreFromCache() {
        if dailyByDay.isEmpty {
            dailyByDay = AppGroupCache.load(.powerDaily, as: [String: Double].self) ?? [:]
        }
        if weeklyByWeekStart.isEmpty {
            weeklyByWeekStart = AppGroupCache.load(.powerWeekly, as: [String: Double].self) ?? [:]
        }
        if monthlyByMonth.isEmpty {
            monthlyByMonth = AppGroupCache.load(.powerMonthly, as: [String: Double].self) ?? [:]
        }
    }
}
