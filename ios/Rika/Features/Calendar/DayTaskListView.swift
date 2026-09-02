import SwiftUI

/// Port of src/components/DayTaskList.tsx — the selected day's tasks, with that
/// day's power reading in the header.
struct DayTaskListView: View {

    @Environment(TaskStore.self) private var tasks
    @Environment(PowerStore.self) private var power

    let selectedDate: Date

    private var key: String { DayKey.string(from: selectedDate) }
    private var dayTasks: [TodoTask] { tasks.tasks(on: key) }
    private var active: [TodoTask] { dayTasks.filter { !$0.completed } }
    private var completed: [TodoTask] { dayTasks.filter(\.completed) }
    private var dayPower: Double { power.power(onDay: key) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            header

            if dayTasks.isEmpty && dayPower == 0 {
                Text("No tasks for this day")
                    .font(Typo.label)
                    .foregroundStyle(Palette.hint)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 24)
            } else {
                // Short by construction — one day's tasks — so a plain stack is
                // the right call here rather than a List.
                LazyVStack(spacing: 8) {
                    ForEach(active) { task in
                        TaskRow(task: task, showDate: false)
                    }
                    ForEach(completed) { task in
                        TaskRow(task: task, showDate: false)
                    }
                }
            }
        }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Text(DateDisplay.weekdayLong(selectedDate))
                .font(Typo.micro)
                .textCase(.uppercase)
                .tracking(Typo.trackingWide)
                .foregroundStyle(Palette.hint)

            if !dayTasks.isEmpty {
                Text("\(active.count) task\(active.count == 1 ? "" : "s")")
                    .font(Typo.micro)
                    .foregroundStyle(Palette.text)
            }

            Spacer()

            if dayPower > 0 {
                HStack(spacing: 3) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 8, weight: .bold))
                    Text("\(String(format: "%.1f", dayPower)) kWh")
                }
                .font(Typo.micro)
                .foregroundStyle(Palette.orange)
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Capsule().fill(Palette.orange.opacity(0.12)))
            }
        }
        .pageInset()
    }
}
