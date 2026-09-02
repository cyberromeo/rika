import Foundation

/// Display priority. Note that this is the *inverse* of Todoist's wire value:
/// wire 4 (urgent) is `p1`. Ported from `todoistPriorityToDisplay`
/// (src/api/todoist.ts:162), where getting it backwards would silently paint
/// every urgent task grey.
enum Priority: String, Codable, CaseIterable, Comparable, Sendable {
    case p1, p2, p3, p4

    init(wire: Int) {
        switch wire {
        case 4: self = .p1
        case 3: self = .p2
        case 2: self = .p3
        default: self = .p4
        }
    }

    var wire: Int {
        switch self {
        case .p1: return 4
        case .p2: return 3
        case .p3: return 2
        case .p4: return 1
        }
    }

    var label: String {
        switch self {
        case .p1: return "Urgent"
        case .p2: return "High"
        case .p3: return "Medium"
        case .p4: return "Low"
        }
    }

    /// `p1 < p2 < p3 < p4`, so a plain sort puts the most urgent first — the
    /// ordering `sortByPriority` relies on in src/pages/TasksPage.tsx:23.
    static func < (lhs: Priority, rhs: Priority) -> Bool {
        lhs.rank < rhs.rank
    }

    private var rank: Int {
        switch self {
        case .p1: return 0
        case .p2: return 1
        case .p3: return 2
        case .p4: return 3
        }
    }
}

/// The app's own task shape — `Task` in the web app, renamed because `Task` is
/// Swift Concurrency's.
struct TodoTask: Identifiable, Codable, Hashable, Sendable {
    let id: String
    var title: String
    var description: String
    /// `YYYY-MM-DD`, or empty when the task has no due date.
    var dueDate: String
    var priority: Priority
    var completed: Bool
    var createdAt: String
    var labels: [String]
    var isRecurring: Bool
    var sectionID: String?

    init(wire: TodoistTask) {
        id = wire.id
        title = wire.content
        description = wire.description
        dueDate = wire.due?.dayOnly ?? ""
        priority = Priority(wire: wire.priority)
        completed = wire.checked
        createdAt = wire.addedAt
        labels = wire.labels
        isRecurring = wire.due?.isRecurring ?? false
        sectionID = wire.sectionID
    }

    /// Parsed due date in the current calendar, or nil when there is none.
    var due: Date? { DayKey.date(from: dueDate) }
}

/// Fallback classification for shopping items when no Todoist section matches —
/// the label regex from src/pages/TasksPage.tsx:34.
extension TodoTask {
    var looksLikeShopping: Bool {
        labels.contains { label in
            let l = label.lowercased()
            return l.contains("shopping") || l.contains("grocer") || l.contains("buy")
        }
    }
}
