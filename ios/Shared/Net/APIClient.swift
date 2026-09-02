import Foundation

enum APIError: LocalizedError, Equatable {
    /// A credential or base URL is missing, so the request was never attempted.
    case notConfigured(String)
    case badURL
    case http(status: Int, body: String)
    case transport(String)
    case decoding(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured(let what): return "\(what) is not configured"
        case .badURL: return "Malformed URL"
        case .http(let status, let body):
            return body.isEmpty ? "HTTP \(status)" : "HTTP \(status): \(body)"
        case .transport(let message): return message
        case .decoding(let message): return "Could not read the response: \(message)"
        }
    }
}

/// One shared async HTTP client for all six services.
///
/// The web app repeats a fetch-check-throw block in every service file; this
/// collapses that into one place and adds the two things the browser gave for
/// free and URLSession does not: a default timeout short enough that a dead
/// endpoint does not hang a screen, and a cache policy that never serves a
/// stale body for a polling request.
struct APIClient {

    static let shared = APIClient()

    private let session: URLSession

    init(timeout: TimeInterval = 20) {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = timeout
        config.timeoutIntervalForResource = timeout * 2
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.waitsForConnectivity = false
        session = URLSession(configuration: config)
    }

    // ── Requests ────────────────────────────────────────────────────────────

    func get<T: Decodable>(
        _ url: URL,
        headers: [String: String] = [:],
        as type: T.Type
    ) async throws -> T {
        let data = try await data(for: request(url, method: "GET", headers: headers))
        return try decode(type, from: data)
    }

    func getText(_ url: URL, headers: [String: String] = [:]) async throws -> String {
        let data = try await data(for: request(url, method: "GET", headers: headers))
        return String(decoding: data, as: UTF8.self)
    }

    func post<T: Decodable>(
        _ url: URL,
        body: some Encodable,
        headers: [String: String] = [:],
        as type: T.Type
    ) async throws -> T {
        var req = request(url, method: "POST", headers: headers)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try encode(body)
        let data = try await data(for: req)
        return try decode(type, from: data)
    }

    /// POST where the response body is not needed (Todoist close/reopen).
    func postIgnoringResponse(
        _ url: URL,
        body: (some Encodable)? = Optional<String>.none,
        headers: [String: String] = [:]
    ) async throws {
        var req = request(url, method: "POST", headers: headers)
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try encode(body)
        }
        _ = try await data(for: req)
    }

    func delete(_ url: URL, headers: [String: String] = [:]) async throws {
        _ = try await data(for: request(url, method: "DELETE", headers: headers))
    }

    // ── Plumbing ────────────────────────────────────────────────────────────

    private func request(_ url: URL, method: String, headers: [String: String]) -> URLRequest {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (field, value) in headers {
            req.setValue(value, forHTTPHeaderField: field)
        }
        return req
    }

    private func data(for request: URLRequest) async throws -> Data {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError where error.code == .cancelled {
            throw CancellationError()
        } catch {
            throw APIError.transport(error.localizedDescription)
        }

        guard let http = response as? HTTPURLResponse else { return data }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(decoding: data.prefix(300), as: UTF8.self)
            throw APIError.http(status: http.statusCode, body: body)
        }
        return data
    }

    private func encode(_ value: some Encodable) throws -> Data {
        do {
            return try JSONEncoder().encode(value)
        } catch {
            throw APIError.decoding(error.localizedDescription)
        }
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try JSONDecoder().decode(type, from: data)
        } catch {
            throw APIError.decoding(String(describing: error))
        }
    }
}
