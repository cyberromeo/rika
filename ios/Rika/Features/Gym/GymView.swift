import SwiftUI

enum GymSubTab: String, CaseIterable, Identifiable, Hashable {
    case recovery, sessions, stats

    var id: String { rawValue }

    var label: String {
        switch self {
        case .recovery: return "Recovery"
        case .sessions: return "Sessions"
        case .stats: return "Stats"
        }
    }

    var symbol: String {
        switch self {
        case .recovery: return "heart.fill"
        case .sessions: return "dumbbell.fill"
        case .stats: return "chart.bar.fill"
        }
    }
}

/// Port of src/pages/GymPage.tsx.
struct GymView: View {

    @Environment(MotraStore.self) private var motra
    @State private var tab: GymSubTab = .recovery

    private var subtitle: String {
        guard let data = motra.data else { return "Loading recovery from Motra…" }
        guard let last = data.lastWorkout, let date = DayKey.date(from: last.date) else {
            return "\(data.lifetime.workouts) lifetime workouts"
        }
        let relative = DateDisplay.relativeDay(date, capitalized: false)
        return "Last session \(relative) · \(data.lifetime.workouts) lifetime"
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Text(subtitle)
                    .font(Typo.pageSubtitle)
                    .foregroundStyle(Palette.hint)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .pageInset()

                SubTabBar(
                    tabs: GymSubTab.allCases,
                    selection: $tab,
                    label: \.label,
                    symbol: \.symbol
                )

                if motra.loading && motra.data == nil {
                    LoadingPane(message: "Fetching workout data…")
                } else if let data = motra.data {
                    switch tab {
                    case .recovery: GymRecoveryTab(data: data)
                    case .sessions: GymSessionsTab(data: data)
                    case .stats: GymStatsTab(data: data)
                    }
                } else if let error = motra.errorMessage {
                    ErrorPane(message: error) { Task { await motra.load() } }
                }
            }
            .background(Palette.bg)
            .navigationTitle("Gym")
            .navigationBarTitleDisplayMode(.large)
        }
        .task { await motra.pollLoop() }
    }
}
