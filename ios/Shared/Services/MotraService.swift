import Foundation

/// Motra gym recovery. Port of src/api/motra.ts.
///
/// The web version tries a relative Vercel path first and the public host
/// second; the native app only has the public host, so there is one URL.
struct MotraService: Sendable {

    static let shared = MotraService()

    /// Fetches fresh data, writing it to the shared cache on success. Throws
    /// rather than silently returning defaults — the store decides whether to
    /// fall back to the cache, so the UI can say when it is showing stale data.
    func fetch() async throws -> MotraData {
        guard let url = AppConfig.motraURL else { throw APIError.notConfigured("Motra URL") }
        let response = try await APIClient.shared.get(url, as: MotraResponse.self)
        guard response.isSuccess, let data = response.data else {
            throw APIError.decoding("Motra returned status \(response.status)")
        }
        AppGroupCache.save(.motra, data)
        return data
    }

    /// Last known good value, for a first paint before the network answers.
    func cached() -> MotraData? {
        AppGroupCache.load(.motra, as: MotraData.self)
    }
}

/// medx FMGE syllabus tracker. Port of src/api/tracker.ts.
struct TrackerService: Sendable {

    static let shared = TrackerService()

    private func url() throws -> URL {
        guard let base = AppConfig.medxBaseURL else { throw APIError.notConfigured("medx URL") }
        return base.appendingPathComponent("tracker")
    }

    func fetch() async throws -> TrackerData {
        guard var comps = URLComponents(url: try url(), resolvingAgainstBaseURL: false) else {
            throw APIError.badURL
        }
        comps.queryItems = [URLQueryItem(name: "userId", value: AppConfig.medxUserID)]
        guard let url = comps.url else { throw APIError.badURL }

        let data = try await APIClient.shared.get(url, as: TrackerData.self)
        AppGroupCache.save(.tracker, data)
        return data
    }

    func cached() -> TrackerData? {
        AppGroupCache.load(.tracker, as: TrackerData.self)
    }

    // ── Writes ──────────────────────────────────────────────────────────────

    private struct SubjectUpdate: Encodable {
        let userId: String
        let subject: String
        let field: String
        let value: Bool
    }

    private struct GTUpdate: Encodable {
        let userId: String
        let gt: String
        let value: Bool
    }

    private struct Ack: Decodable {}

    func setSubject(_ subject: String, field: SubjectField, to value: Bool) async throws {
        let body = SubjectUpdate(
            userId: AppConfig.medxUserID,
            subject: subject,
            field: field.rawValue,
            value: value
        )
        try await APIClient.shared.postIgnoringResponse(try url(), body: body)
    }

    func setGrandTest(_ gt: String, to value: Bool) async throws {
        let body = GTUpdate(userId: AppConfig.medxUserID, gt: gt, value: value)
        try await APIClient.shared.postIgnoringResponse(try url(), body: body)
    }
}
