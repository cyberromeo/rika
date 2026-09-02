import SwiftUI

/// Port of src/pages/CalendarPage.tsx — the month grid over the selected day's
/// task list.
struct CalendarTabView: View {

    @Environment(TaskStore.self) private var tasks
    @Environment(PowerStore.self) private var power

    @State private var selectedDate = Date()
    @State private var visibleMonth = Date()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    MonthGrid(
                        visibleMonth: $visibleMonth,
                        selectedDate: $selectedDate
                    )
                    DayTaskListView(selectedDate: selectedDate)
                }
                .padding(.top, 4)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .background(Palette.bg)
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.large)
            .refreshable { await tasks.load() }
            .task(id: DayKey.monthString(from: visibleMonth)) {
                await power.loadMonthIfNeeded(visibleMonth)
            }
        }
    }
}
