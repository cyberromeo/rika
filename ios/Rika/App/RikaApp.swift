import SwiftUI

@main
struct RikaApp: App {

    /// Stores are created once for the process and shared through the
    /// environment, mirroring the `TaskProvider` / `PowerProvider` pair the web
    /// app wraps its tree in.
    @State private var tasks = TaskStore()
    @State private var power = PowerStore()
    @State private var motra = MotraStore()
    @State private var tracker = TrackerStore()
    @State private var study = StudyStore()

    init() {
        // Copy any build-time credentials into the keychain before the first
        // service call can ask for them.
        AppSecrets.seedFromBundleIfNeeded()
    }

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environment(tasks)
                .environment(power)
                .environment(motra)
                .environment(tracker)
                .environment(study)
                .preferredColorScheme(.dark)
                .tint(Palette.blue)
        }
        .backgroundTask(.appRefresh(AppConfig.refreshTaskID)) {
            await RefreshScheduler.runRefresh()
        }
    }
}
