import Foundation

/// The derived views of the task list. Ported from the `useMemo` in
/// TasksPage.tsx:16 and the small selectors in HomePage / CalendarGrid /
/// DayTaskList.
///
/// These are computed properties rather than cached state: the list is a few
/// hundred rows at most, and a stale bucket after an optimistic toggle would be
/// a worse bug than the recomputation costs.
extension TaskStore {

    /// A task counts as shopping when its section is a "shopping" section, or —
    /// when no such section exists — when a label looks like one.
    func isShopping(_ task: TodoTask) -> Bool {
        if let sectionID = task.sectionID, !shoppingSectionIDs.isEmpty {
            return shoppingSectionIDs.contains(sectionID)
        }
        return task.looksLikeShopping
    }

    var mainListTasks: [TodoTask] {
        tasks.filter { !isShopping($0) }
    }

    struct Buckets {
        var overdue: [TodoTask] = []
        var today: [TodoTask] = []
        var upcoming: [TodoTask] = []
        var completed: [TodoTask] = []

        var activeCount: Int { overdue.count + today.count + upcoming.count }
        var isEmpty: Bool { activeCount == 0 && completed.isEmpty }
    }

    var buckets: Buckets {
        var result = Buckets()
        let startOfToday = DayKey.startOfDay(Date())

        for task in mainListTasks {
            if task.completed {
                result.completed.append(task)
            } else if let due = task.due {
                if DayKey.isToday(due) {
                    result.today.append(task)
                } else if due < startOfToday {
                    result.overdue.append(task)
                } else {
                    result.upcoming.append(task)
                }
            } else {
                // No due date sorts into Upcoming, as in the web app.
                result.upcoming.append(task)
            }
        }

        result.overdue.sort { $0.priority < $1.priority }
        result.today.sort { $0.priority < $1.priority }
        result.upcoming.sort(by: TaskStore.byDateThenPriority)

        return result
    }

    // ── Shopping ────────────────────────────────────────────────────────────

    var shoppingTasks: [TodoTask] { tasks.filter { isShopping($0) } }
    var shoppingPending: [TodoTask] { shoppingTasks.filter { !$0.completed } }
    var shoppingBought: [TodoTask] { shoppingTasks.filter(\.completed) }
    var shoppingCount: Int { shoppingPending.count }

    // ── Calendar ────────────────────────────────────────────────────────────

    func tasks(on dayKey: String) -> [TodoTask] {
        tasks.filter { $0.dueDate == dayKey }
    }

    /// `YYYY-MM-DD` → up to three distinct priorities, most urgent first: the
    /// dots under each calendar cell (CalendarGrid.tsx:85).
    var priorityDotsByDay: [String: [Priority]] {
        var map: [String: Set<Priority>] = [:]
        for task in tasks where !task.completed && !task.dueDate.isEmpty {
            map[task.dueDate, default: []].insert(task.priority)
        }
        return map.mapValues { Array($0).sorted().prefix(3).map { $0 } }
    }

    // ── Home subtitle ───────────────────────────────────────────────────────

    /// "3 due today · 1 overdue" and its variants (HomePage.tsx:26).
    var homeSubtitle: String {
        let startOfToday = DayKey.startOfDay(Date())
        var todayCount = 0
        var overdueCount = 0

        for task in tasks where !task.completed {
            guard let due = task.due else { continue }
            if DayKey.isToday(due) {
                todayCount += 1
            } else if due < startOfToday {
                overdueCount += 1
            }
        }

        if overdueCount > 0 && todayCount > 0 {
            return "\(todayCount) due today · \(overdueCount) overdue"
        }
        if overdueCount > 0 {
            return "\(overdueCount) overdue task\(overdueCount == 1 ? "" : "s")"
        }
        if todayCount > 0 {
            return "\(todayCount) task\(todayCount == 1 ? "" : "s") due today"
        }
        return "All caught up for today"
    }
}
