import SwiftUI

/// Four tabs. On iOS 26 `TabView` adopts the Liquid Glass tab bar automatically, so
/// there's nothing to style here — and nothing should be styled, since a custom
/// background is exactly what stops the system material from working.
struct RootView: View {
    @Environment(SessionEngine.self) private var engine
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        TabView {
            Tab("Focus", systemImage: "timer") {
                FocusView()
            }
            Tab("Blocklist", systemImage: "hand.raised.fill") {
                BlocklistView()
            }
            Tab("Insights", systemImage: "chart.bar.fill") {
                InsightsView()
                    // The tab bar gets out of the way while scrolling a long
                    // report; it stays put on Focus, where it's the only navigation.
                    .tabBarMinimizeBehavior(.onScrollDown)
            }
            Tab("Settings", systemImage: "gearshape.fill") {
                SettingsView()
            }
        }
        .tint(engine.isActive ? engine.mode.tint : Theme.blue)
        .onChange(of: scenePhase) { _, phase in
            // Everything time-derived is recomputed here rather than polled: coming
            // back to the foreground is the only moment the app can be wrong about
            // what happened while it was away.
            if phase == .active { engine.reconcile() }
        }
    }
}
