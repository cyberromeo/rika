import SwiftUI

/// Port of src/components/CalendarGrid.tsx — a Monday-first month grid where each
/// cell shows either the day's kWh or up to three task-priority dots.
struct MonthGrid: View {

    @Environment(TaskStore.self) private var tasks
    @Environment(PowerStore.self) private var power

    @Binding var visibleMonth: Date
    @Binding var selectedDate: Date

    private let weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)

    /// Six weeks of cells covering the visible month, Monday-aligned.
    private var days: [Date] {
        let monthStart = DayKey.startOfMonth(visibleMonth)
        let gridStart = DayKey.startOfWeekMonday(monthStart)
        let gridEnd = DayKey.endOfWeekMonday(DayKey.endOfMonth(monthStart))
        return DayKey.days(from: gridStart, to: gridEnd)
    }

    private var monthPower: Double {
        power.power(inMonth: DayKey.monthString(from: visibleMonth))
    }

    private var dots: [String: [Priority]] { tasks.priorityDotsByDay }

    var body: some View {
        VStack(spacing: 12) {
            nav

            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(weekdays, id: \.self) { day in
                    Text(day)
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(Typo.trackingWide)
                        .foregroundStyle(Palette.hint)
                        .frame(maxWidth: .infinity)
                }

                ForEach(days, id: \.timeIntervalSince1970) { day in
                    cell(day)
                }
            }
        }
        .card()
        .pageInset()
    }

    // ── Month navigation ────────────────────────────────────────────────────

    private var nav: some View {
        HStack {
            navButton(symbol: "chevron.left", label: "Previous month", months: -1)

            VStack(spacing: 2) {
                Text(DateDisplay.monthYear(visibleMonth))
                    .font(Typo.title)
                    .foregroundStyle(Palette.text)
                if monthPower > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 8, weight: .bold))
                        Text("\(formatKwh(monthPower)) kWh")
                    }
                    .font(Typo.micro)
                    .foregroundStyle(Palette.orange)
                }
            }
            .frame(maxWidth: .infinity)

            navButton(symbol: "chevron.right", label: "Next month", months: 1)
        }
    }

    private func navButton(symbol: String, label: String, months: Int) -> some View {
        Button {
            Haptics.light()
            withAnimation(.easeOut(duration: 0.2)) {
                visibleMonth = DayKey.adding(months: months, to: visibleMonth)
            }
        } label: {
            Image(systemName: symbol)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Palette.text)
                .frame(width: 32, height: 32)
                .background(Circle().fill(Color.white.opacity(0.06)))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    // ── Day cell ────────────────────────────────────────────────────────────

    private func cell(_ day: Date) -> some View {
        let key = DayKey.string(from: day)
        let inMonth = DayKey.isSameMonth(day, visibleMonth)
        let isSelected = DayKey.isSameDay(day, selectedDate)
        let isToday = DayKey.isToday(day)
        let dayPower = inMonth ? power.power(onDay: key) : 0
        let priorities = dots[key] ?? []

        return Button {
            Haptics.selection()
            selectedDate = day
        } label: {
            VStack(spacing: 2) {
                Text("\(Calendar.current.component(.day, from: day))")
                    .font(.system(size: 14, weight: isToday ? .bold : .regular))
                    .foregroundStyle(
                        inMonth ? (isToday ? Palette.blue : Palette.text) : Palette.p4
                    )

                // Power reads as the more useful signal when there is any, so it
                // takes the slot; dots only show on days with no recorded usage.
                if dayPower > 0 {
                    Text(String(format: "%.1f", dayPower))
                        .font(.system(size: 8, weight: .semibold))
                        .foregroundStyle(Palette.orange)
                } else if !priorities.isEmpty {
                    HStack(spacing: 2) {
                        ForEach(priorities, id: \.self) { priority in
                            Circle()
                                .fill(color(for: priority))
                                .frame(width: 4, height: 4)
                        }
                    }
                } else {
                    Spacer().frame(height: 9)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 40)
            .background {
                RoundedRectangle(cornerRadius: Metrics.radiusSmall)
                    .fill(isSelected ? Palette.blue.opacity(0.22) : Color.clear)
            }
            .overlay {
                if isToday && !isSelected {
                    RoundedRectangle(cornerRadius: Metrics.radiusSmall)
                        .strokeBorder(Palette.blue.opacity(0.45), lineWidth: 1)
                }
            }
            .contentShape(.rect(cornerRadius: Metrics.radiusSmall))
        }
        .buttonStyle(.plain)
    }

    private func color(for priority: Priority) -> Color {
        switch priority {
        case .p1: return Palette.p1
        case .p2: return Palette.p2
        case .p3: return Palette.p3
        case .p4: return Palette.p4
        }
    }
}
