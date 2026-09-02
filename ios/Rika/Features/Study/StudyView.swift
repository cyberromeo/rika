import SwiftUI

enum StudySubTab: String, CaseIterable, Identifiable, Hashable {
    case overview, subjects, timer

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .overview: return "square.grid.2x2"
        case .subjects: return "checkmark.circle"
        case .timer: return "clock"
        }
    }
}

/// Port of src/pages/StudyPage.tsx — countdown and stats, the syllabus tracker,
/// and the focus timer, behind one segmented control.
struct StudyView: View {

    @Environment(TrackerStore.self) private var tracker
    @Environment(StudyStore.self) private var study

    @State private var tab: StudySubTab = .overview

    private var progressLabel: String {
        guard let data = tracker.data else { return "Subjects" }
        return "Subjects (\(data.progressPercent)%)"
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                SubTabBar(
                    tabs: StudySubTab.allCases,
                    selection: $tab,
                    label: { sub in
                        switch sub {
                        case .overview: return "Overview"
                        case .subjects: return progressLabel
                        case .timer: return "Timer"
                        }
                    },
                    symbol: \.symbol
                )

                switch tab {
                case .overview:
                    StudyOverviewTab(onOpen: { tab = $0 })
                case .subjects:
                    SubjectTrackerTab()
                case .timer:
                    FocusTimerTab()
                }
            }
            .background(Palette.bg)
            .navigationTitle("Study")
            .navigationBarTitleDisplayMode(.large)
        }
        .task { await tracker.pollLoop() }
        .task { await study.pollLoop() }
    }
}
