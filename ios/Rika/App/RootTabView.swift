import SwiftUI

enum RootTab: String, Hashable, CaseIterable {
    case home, tasks, calendar, study, gym

    var title: String {
        switch self {
        case .home: return "Home"
        case .tasks: return "Tasks"
        case .calendar: return "Calendar"
        case .study: return "Study"
        case .gym: return "Gym"
        }
    }

    /// SF Symbol equivalents of the Framework7 icons in `src/App.tsx:16-22`.
    var symbol: String {
        switch self {
        case .home: return "house.fill"
        case .tasks: return "checkmark.circle.fill"
        case .calendar: return "calendar"
        case .study: return "book.fill"
        case .gym: return "flame.fill"
        }
    }
}

/// The five-tab shell.
///
/// This replaces both Framework7's iOS tabbar and the `pointerup` capture-phase
/// workaround at `src/App.tsx:79-99` that existed because F7 v9 calls
/// `preventDefault()` on touchstart and re-emits a synthetic click, which
/// Telegram's WebView sometimes dropped. A native tab bar has no such path.
///
/// The bar picks up Liquid Glass automatically on iOS 26 — there is nothing to
/// apply here, and applying anything would fight it.
struct RootTabView: View {

    @State private var selection: RootTab = .home

    var body: some View {
        TabView(selection: $selection) {
            Tab(RootTab.home.title, systemImage: RootTab.home.symbol, value: .home) {
                HomeView(selection: $selection)
            }
            Tab(RootTab.tasks.title, systemImage: RootTab.tasks.symbol, value: .tasks) {
                TasksView()
            }
            Tab(RootTab.calendar.title, systemImage: RootTab.calendar.symbol, value: .calendar) {
                CalendarTabView()
            }
            Tab(RootTab.study.title, systemImage: RootTab.study.symbol, value: .study) {
                StudyView()
            }
            Tab(RootTab.gym.title, systemImage: RootTab.gym.symbol, value: .gym) {
                GymView()
            }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .onChange(of: selection) { _, _ in
            // Matches the light impact the web app fires on tab switch.
            Haptics.light()
        }
    }
}
