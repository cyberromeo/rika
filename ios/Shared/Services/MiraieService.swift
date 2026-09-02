import Foundation

/// MirAIe power consumption for the Panasonic AC. Port of src/api/miraie.ts.
struct MiraieService: Sendable {

    static let shared = MiraieService()

    private func url(grain: PowerGrain, start: String, end: String) throws -> URL {
        guard let base = AppConfig.miraieBaseURL else {
            throw APIError.notConfigured("MirAIe URL")
        }
        guard let device = AppSecrets.miraieDeviceID, !device.isEmpty else {
            throw APIError.notConfigured("MirAIe device id")
        }
        let path = base
            .appendingPathComponent("powerConsumption")
            .appendingPathComponent("devices")
            .appendingPathComponent(device)
        guard var comps = URLComponents(url: path, resolvingAgainstBaseURL: false) else {
            throw APIError.badURL
        }
        comps.queryItems = [
            URLQueryItem(name: "grain", value: grain.rawValue),
            URLQueryItem(name: "startDate", value: start),
            URLQueryItem(name: "endDate", value: end),
        ]
        guard let url = comps.url else { throw APIError.badURL }
        return url
    }

    private func headers() throws -> [String: String] {
        guard let token = AppSecrets.miraieToken else {
            throw APIError.notConfigured("MirAIe token")
        }
        return [
            "Authorization": "Bearer \(token)",
            "Content-Type": "application/json",
        ]
    }

    private func fetch(grain: PowerGrain, start: String, end: String) async throws -> [PowerEntry] {
        try await APIClient.shared.get(
            try url(grain: grain, start: start, end: end),
            headers: try headers(),
            as: [PowerEntry].self
        )
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /// Daily kWh across an inclusive date range.
    func daily(from start: Date, to end: Date) async throws -> [PowerEntry] {
        try await fetch(
            grain: .daily,
            start: MiraieDate.ddmmyyyy(start),
            end: MiraieDate.ddmmyyyy(end)
        )
    }

    /// Weekly kWh. The API requires **Sunday-aligned** bounds — passing a
    /// mid-week date returns an empty array rather than an error, which is how
    /// this silently broke in the web app before powerStore.tsx:109 pinned it.
    func weekly(from start: Date, to end: Date) async throws -> [PowerEntry] {
        let alignedStart = DayKey.startOfWeekSunday(start)
        let alignedEnd = DayKey.startOfWeekSunday(end)
        return try await fetch(
            grain: .weekly,
            start: MiraieDate.ddmmyyyy(alignedStart),
            end: MiraieDate.ddmmyyyy(alignedEnd)
        )
    }

    /// Monthly kWh. The API only keeps about six months.
    func monthly(from start: Date, to end: Date) async throws -> [PowerEntry] {
        try await fetch(
            grain: .monthly,
            start: MiraieDate.mmyyyy(start),
            end: MiraieDate.mmyyyy(end)
        )
    }
}
