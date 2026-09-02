import Foundation

/// Thin client for the medx study-time API that the web app already uses
/// (`api/studytime.js`).
///
/// One behaviour here is not obvious and matters a lot: **completed sessions are
/// never logged from the client.** The backend lazily evaluates any expired
/// `activeTimer` at the top of every request and writes the log itself
/// (`api/studytime.js`, `getOrInitState`), so the correct completion call is
/// `cancel_timer` alone — the server logs the duration first, then clears the
/// timer. Sending `log` as well double-counts the session, which is exactly the bug
/// the web app has today.
struct MedxClient {

    struct Config {
        let baseURL: URL
        let password: String

        /// Read from the build settings in `Config/Secrets.xcconfig` via Info.plist,
        /// so the credential isn't a literal in tracked source.
        static func fromBundle() -> Config? {
            let info = Bundle.main.infoDictionary
            let urlString = info?["MedxBaseURL"] as? String ?? ""
            let password = info?["MedxPassword"] as? String ?? ""
            guard let url = URL(string: urlString), !password.isEmpty else { return nil }
            return Config(baseURL: url, password: password)
        }
    }

    let config: Config
    private let session: URLSession

    /// Explicit rather than memberwise: the synthesised init would be `private`
    /// because `session` is, and `SyncCoordinator` lives in another file.
    init(config: Config) {
        self.config = config
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 12
        // Local-first means a request is never worth waiting on — fail fast and let
        // the queue retry rather than holding a connection open.
        configuration.waitsForConnectivity = false
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Reads

    /// Today's totals, goals and streak as the backend sees them.
    func fetchState() async throws -> RemoteState {
        var components = URLComponents(
            url: config.baseURL.appendingPathComponent("api/studytime"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "password", value: config.password)]
        guard let url = components?.url else { throw MedxError.badURL }

        let (data, response) = try await session.data(from: url)
        try Self.validate(response)
        return try JSONDecoder().decode(Envelope.self, from: data).state
    }

    // MARK: - Writes

    func startTimer(durationSeconds: Int, mode: String, note: String) async throws {
        try await post([
            "action": "start_timer",
            "durationSeconds": durationSeconds,
            "mode": mode,
            "note": note,
        ])
    }

    func pauseTimer() async throws { try await post(["action": "pause_timer"]) }
    func resumeTimer() async throws { try await post(["action": "resume_timer"]) }
    func cancelTimer() async throws { try await post(["action": "cancel_timer"]) }

    /// Only for partial time from an abandoned session. See the type doc.
    func log(seconds: Int, mode: String, note: String) async throws {
        try await post([
            "action": "log",
            "seconds": seconds,
            "mode": mode,
            "note": note,
            "source": "ios_lockin",
        ])
    }

    private func post(_ body: [String: Any]) async throws {
        var payload = body
        payload["password"] = config.password

        var request = URLRequest(url: config.baseURL.appendingPathComponent("api/studytime"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (_, response) = try await session.data(for: request)
        try Self.validate(response)
    }

    private static func validate(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else { throw MedxError.badResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw MedxError.status(http.statusCode)
        }
    }
}

// MARK: - Wire types

extension MedxClient {
    struct Envelope: Decodable {
        let success: Bool
        let state: RemoteState
    }

    /// Only the fields the iOS app actually displays. The backend returns a much
    /// larger document (todos, webhooks, per-day maps); decoding just this subset
    /// keeps the client from breaking when unrelated fields change.
    struct RemoteState: Decodable, Sendable {
        var currentStudyDay: String
        var todayStudySeconds: Double
        var todayPyqSeconds: Double
        var dailyGoalSeconds: Double
        var dailyPyqGoalSeconds: Double
        var streak: Int

        enum CodingKeys: String, CodingKey {
            case currentStudyDay, todayStudySeconds, todayPyqSeconds
            case dailyGoalSeconds, dailyPyqGoalSeconds, streak
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            currentStudyDay = try c.decodeIfPresent(String.self, forKey: .currentStudyDay) ?? ""
            todayStudySeconds = try c.decodeIfPresent(Double.self, forKey: .todayStudySeconds) ?? 0
            todayPyqSeconds = try c.decodeIfPresent(Double.self, forKey: .todayPyqSeconds) ?? 0
            dailyGoalSeconds = try c.decodeIfPresent(Double.self, forKey: .dailyGoalSeconds) ?? 11 * 3600
            dailyPyqGoalSeconds = try c.decodeIfPresent(Double.self, forKey: .dailyPyqGoalSeconds) ?? 2 * 3600
            streak = try c.decodeIfPresent(Int.self, forKey: .streak) ?? 0
        }
    }
}

enum MedxError: Error {
    case badURL
    case badResponse
    case status(Int)
    case notConfigured
}
