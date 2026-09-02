import Foundation
import Observation

/// Todoist-backed task state. Port of src/store/taskStore.tsx plus the bucketing
/// that TasksPage.tsx does in a `useMemo`.
@MainActor
@Observable
final class TaskStore {

    private(set) var tasks: [TodoTask] = []
    private(set) var loading = true
    private(set) var errorMessage: String?
    /// Ids of every Todoist section whose name contains "shopping".
    private(set) var shoppingSectionIDs: Set<String> = []

    private let service = TodoistService.shared

    // ── Loading ─────────────────────────────────────────────────────────────

    func load() async {
        guard AppSecrets.hasTodoist else {
            loading = false
            errorMessage = "Todoist token is not configured"
            tasks = AppGroupCache.load(.tasks, as: [TodoTask].self) ?? []
            return
        }

        loading = true
        errorMessage = nil

        do {
            // Sections are optional context — a failure there must not cost us
            // the task list, which is what `.catch(() => [])` buys in the web app.
            async let taskList = service.fetchAllTasks()
            async let sectionList = service.fetchAllSections()

            let wire = try await taskList
            let sections = (try? await sectionList) ?? []

            shoppingSectionIDs = Set(
                sections
                    .filter { $0.name.range(of: "shopping", options: .caseInsensitive) != nil }
                    .map(\.id)
            )

            tasks = wire
                .filter { !$0.isDeleted }
                .map(TodoTask.init(wire:))
                .sorted(by: Self.byDateThenPriority)

            AppGroupCache.save(.tasks, tasks)
            errorMessage = nil
        } catch is CancellationError {
            // Screen went away mid-flight; leave state as it was.
        } catch {
            errorMessage = error.localizedDescription
            if tasks.isEmpty {
                tasks = AppGroupCache.load(.tasks, as: [TodoTask].self) ?? []
            }
        }
        loading = false
    }

    /// Undated tasks sort last; otherwise by date, then priority.
    static func byDateThenPriority(_ a: TodoTask, _ b: TodoTask) -> Bool {
        switch (a.dueDate.isEmpty, b.dueDate.isEmpty) {
        case (false, true): return true
        case (true, false): return false
        case (true, true): return a.priority < b.priority
        case (false, false):
            if a.dueDate != b.dueDate { return a.dueDate < b.dueDate }
            return a.priority < b.priority
        }
    }

    // ── Mutations ───────────────────────────────────────────────────────────

    func add(title: String, description: String, dueDate: String, priority: Priority) async {
        do {
            let created = try await service.createTask(
                title: title,
                description: description,
                dueDate: dueDate,
                priority: priority
            )
            tasks.insert(TodoTask(wire: created), at: 0)
            tasks.sort(by: Self.byDateThenPriority)
            AppGroupCache.save(.tasks, tasks)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Optimistic toggle: flip locally, then reconcile. A failed close reverts,
    /// which is the behaviour the web store implements with REVERT_COMPLETE.
    func toggle(_ id: String) async {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else { return }
        let wasCompleted = tasks[index].completed
        tasks[index].completed = !wasCompleted
        AppGroupCache.save(.tasks, tasks)

        do {
            if wasCompleted {
                try await service.reopenTask(id: id)
            } else {
                try await service.closeTask(id: id)
            }
        } catch {
            if let i = tasks.firstIndex(where: { $0.id == id }) {
                tasks[i].completed = wasCompleted
            }
            errorMessage = error.localizedDescription
        }
    }

    /// Optimistic delete. Todoist has no undo endpoint, so a failure restores
    /// the row and surfaces the error rather than pretending it worked.
    func delete(_ id: String) async {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else { return }
        let removed = tasks.remove(at: index)
        AppGroupCache.save(.tasks, tasks)

        do {
            try await service.deleteTask(id: id)
        } catch {
            tasks.insert(removed, at: min(index, tasks.count))
            tasks.sort(by: Self.byDateThenPriority)
            errorMessage = error.localizedDescription
        }
    }

    func dismissError() { errorMessage = nil }
}
