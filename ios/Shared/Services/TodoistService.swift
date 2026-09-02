import Foundation

/// Todoist REST v1. Port of src/api/todoist.ts.
struct TodoistService: Sendable {

    static let shared = TodoistService()

    private var client: APIClient { .shared }

    private func headers(includeRequestID: Bool = false) throws -> [String: String] {
        guard let token = AppSecrets.todoistToken else {
            throw APIError.notConfigured("Todoist token")
        }
        var h = ["Authorization": "Bearer \(token)"]
        if includeRequestID {
            // Todoist uses this to make writes idempotent on retry.
            h["X-Request-Id"] = UUID().uuidString
        }
        return h
    }

    private func url(_ path: String, query: [String: String] = [:]) throws -> URL {
        guard let base = AppConfig.todoistBaseURL else { throw APIError.notConfigured("Todoist URL") }
        guard var comps = URLComponents(
            url: base.appendingPathComponent(path),
            resolvingAgainstBaseURL: false
        ) else { throw APIError.badURL }
        if !query.isEmpty {
            comps.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = comps.url else { throw APIError.badURL }
        return url
    }

    // ── Reads ───────────────────────────────────────────────────────────────

    /// Walks `next_cursor` to the end, as `fetchAllTasks` does.
    func fetchAllTasks() async throws -> [TodoistTask] {
        try await fetchAllPages(path: "tasks", of: TodoistTask.self)
    }

    func fetchAllSections() async throws -> [TodoistSection] {
        try await fetchAllPages(path: "sections", of: TodoistSection.self)
    }

    private func fetchAllPages<T: Decodable & Sendable>(
        path: String,
        of type: T.Type
    ) async throws -> [T] {
        var all: [T] = []
        var cursor: String?
        // A cursor loop with no bound is a hang waiting to happen if the API
        // ever returns the same cursor twice; 50 pages is far past this
        // account's task count.
        for _ in 0..<50 {
            let query = cursor.map { ["cursor": $0] } ?? [:]
            let page = try await client.get(
                try url(path, query: query),
                headers: try headers(),
                as: TodoistPage<T>.self
            )
            all.append(contentsOf: page.results)
            guard let next = page.nextCursor, !next.isEmpty, next != cursor else { break }
            cursor = next
        }
        return all
    }

    // ── Writes ──────────────────────────────────────────────────────────────

    struct NewTask: Encodable, Sendable {
        var content: String
        var description: String?
        var dueDate: String?
        var priority: Int?

        enum CodingKeys: String, CodingKey {
            case content, description, priority
            case dueDate = "due_date"
        }
    }

    func createTask(
        title: String,
        description: String,
        dueDate: String,
        priority: Priority
    ) async throws -> TodoistTask {
        let body = NewTask(
            content: title,
            description: description.isEmpty ? nil : description,
            dueDate: dueDate.isEmpty ? nil : dueDate,
            priority: priority.wire
        )
        return try await client.post(
            try url("tasks"),
            body: body,
            headers: try headers(includeRequestID: true),
            as: TodoistTask.self
        )
    }

    func closeTask(id: String) async throws {
        try await client.postIgnoringResponse(
            try url("tasks/\(id)/close"),
            headers: try headers(includeRequestID: true)
        )
    }

    func reopenTask(id: String) async throws {
        try await client.postIgnoringResponse(
            try url("tasks/\(id)/reopen"),
            headers: try headers(includeRequestID: true)
        )
    }

    func deleteTask(id: String) async throws {
        try await client.delete(try url("tasks/\(id)"), headers: try headers())
    }
}
