import SwiftUI

/// Port of src/pages/HomePage.tsx: a greeting, a task-count subtitle, and the
/// four glanceable cards.
struct HomeView: View {

    @Binding var selection: RootTab
    @Environment(TaskStore.self) private var tasks
    @State private var powerSheetOpen = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                PageHeader(
                    DateDisplay.greeting(),
                    subtitle: tasks.loading && tasks.tasks.isEmpty
                        ? "Loading your day…"
                        : tasks.homeSubtitle
                )

                VStack(spacing: Metrics.cardSpacing) {
                    AIUsageCard()
                    FmgeProgressCard { selection = .study }
                    GymRecoveryCard { selection = .gym }
                    PowerCard { powerSheetOpen = true }
                }
                .pageInset()
            }
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
        .background(Palette.bg)
        .sheet(isPresented: $powerSheetOpen) {
            PowerChartSheet()
        }
    }
}
