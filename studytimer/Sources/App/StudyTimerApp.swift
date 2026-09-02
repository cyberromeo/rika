import SwiftData
import SwiftUI

@main
struct StudyTimerApp: App {
    /// SwiftData container for session history. Local-only by design: nothing in the
    /// extensions reads history, and keeping it out of the app group avoids a
    /// second process ever holding the store open.
    private let container: ModelContainer
    @State private var engine: SessionEngine
    @State private var history: HistoryStore
    @State private var sync: SyncCoordinator
    @State private var auth = AuthorizationService()

    /// Main-actor isolated because `SessionEngine` and `HistoryStore` are: the app's
    /// state is all UI-adjacent, and there's no background phase during launch worth
    /// the complexity of making it otherwise.
    @MainActor
    init() {
        let container: ModelContainer
        do {
            container = try ModelContainer(for: SessionRecord.self)
        } catch {
            // An unreadable store is almost always a schema change during
            // development. Losing history is bad; refusing to launch is worse.
            container = try! ModelContainer(
                for: SessionRecord.self,
                configurations: ModelConfiguration(isStoredInMemoryOnly: true)
            )
        }
        self.container = container

        let history = HistoryStore(context: container.mainContext)
        let sync = SyncCoordinator()
        _history = State(initialValue: history)
        _sync = State(initialValue: sync)
        _engine = State(initialValue: SessionEngine(history: history, sync: sync))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(engine)
                .environment(history)
                .environment(sync)
                .environment(auth)
                .modelContainer(container)
                // The whole visual language assumes black. Following the system
                // appearance would leave a light-mode layout nobody designed.
                .preferredColorScheme(.dark)
                .task {
                    auth.refresh()
                    await sync.flush()
                    await sync.refreshRemoteState()
                }
        }
    }
}
