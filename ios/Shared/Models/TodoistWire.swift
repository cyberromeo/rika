import Foundation

// ─── Wire types ─────────────────────────────────────────────────────────────
// Todoist API v1. Transcribed from src/api/todoist.ts.

struct TodoistDue: Decodable, Sendable {
    /// `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`.
    let date: String
    let isRecurring: Bool

    enum CodingKeys: String, CodingKey {
        case date
        case isRecurring = "is_recurring"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        date = try c.decodeIfPresent(String.self, forKey: .date) ?? ""
        isRecurring = try c.decodeIfPresent(Bool.self, forKey: .isRecurring) ?? false
    }

    /// `due.date` can carry a time; the app only ever wants the day part.
    /// Ported from `extractDateFromDue` (src/api/todoist.ts:182).
    var dayOnly: String {
        guard let cut = date.firstIndex(of: "T") else { return date }
        return String(date[date.startIndex..<cut])
    }
}

struct TodoistTask: Decodable, Sendable {
    let id: String
    let content: String
    let description: String
    let checked: Bool
    /// Wire priority: 1 = normal … 4 = urgent. Inverted from the display scale.
    let priority: Int
    let due: TodoistDue?
    let labels: [String]
    let sectionID: String?
    let addedAt: String
    let isDeleted: Bool

    enum CodingKeys: String, CodingKey {
        case id, content, description, checked, priority, due, labels
        case sectionID = "section_id"
        case addedAt = "added_at"
        case isDeleted = "is_deleted"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        content = try c.decodeIfPresent(String.self, forKey: .content) ?? ""
        description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
        checked = try c.decodeIfPresent(Bool.self, forKey: .checked) ?? false
        priority = try c.decodeIfPresent(Int.self, forKey: .priority) ?? 1
        due = try c.decodeIfPresent(TodoistDue.self, forKey: .due)
        labels = try c.decodeIfPresent([String].self, forKey: .labels) ?? []
        sectionID = try c.decodeIfPresent(String.self, forKey: .sectionID)
        addedAt = try c.decodeIfPresent(String.self, forKey: .addedAt) ?? ""
        isDeleted = try c.decodeIfPresent(Bool.self, forKey: .isDeleted) ?? false
    }
}

struct TodoistSection: Decodable, Sendable {
    let id: String
    let name: String
}

struct TodoistPage<T: Decodable & Sendable>: Decodable, Sendable {
    let results: [T]
    let nextCursor: String?

    enum CodingKeys: String, CodingKey {
        case results
        case nextCursor = "next_cursor"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        results = try c.decodeIfPresent([T].self, forKey: .results) ?? []
        nextCursor = try c.decodeIfPresent(String.self, forKey: .nextCursor)
    }
}
