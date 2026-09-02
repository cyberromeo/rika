import DeviceActivity
import SwiftUI

/// Two zones, deliberately separated.
///
/// **My sessions** comes from local SwiftData: the app owns these numbers, charts
/// them, streaks them, syncs them. **Screen time** is an embedded
/// `DeviceActivityReport` — a view rendered by another process. The app can style
/// and place it but cannot read a single number out of it, which is why there's no
/// combined "focus score" here. Presenting them as one dataset would be a lie the
/// framework won't let this app tell.
struct InsightsView: View {
    @Environment(SessionEngine.self) private var engine
    @Environment(HistoryStore.self) private var history
    @Environment(SyncCoordinator.self) private var sync

    @State private var week: [HistoryStore.DayTotal] = []
    @State private var streak = 0
    @State private var today: (study: TimeInterval, pyq: TimeInterval) = (0, 0)
    @State private var recent: [SessionRecord] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    todayCard
                    weekCard
                    screenTimeCard
                    recentCard
                }
                .padding(20)
            }
            .background(Theme.background)
            .navigationTitle("Insights")
            .scrollContentBackground(.hidden)
            .refreshable {
                await sync.refreshRemoteState()
                reload()
            }
        }
        .onAppear(perform: reload)
        // Recompute when a session ends rather than on a timer.
        .onChange(of: engine.isActive) { _, _ in reload() }
    }

    private func reload() {
        week = history.week()
        streak = history.streak()
        today = history.totals(on: StudyDay.anchor())
        recent = history.recent(limit: 12)
    }

    // MARK: Today

    private var todayCard: some View {
        Card {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("TODAY")
                        .font(Theme.eyebrow)
                        .foregroundStyle(Theme.tertiaryText)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(TimeFormatting.hours(today.study))
                            .font(.system(size: 34, weight: .semibold, design: .rounded))
                            .foregroundStyle(Theme.primaryText)
                            .contentTransition(.numericText())
                        Text("/ \(Int(HistoryStore.dailyStudyGoal / 3600))h")
                            .font(.system(size: 15, weight: .medium, design: .rounded))
                            .foregroundStyle(Theme.tertiaryText)
                    }
                    Text("PYQ \(TimeFormatting.hours(today.pyq)) / \(Int(HistoryStore.dailyPyqGoal / 3600))h")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.secondaryText)
                }

                Spacer()

                VStack(spacing: 3) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(streak > 0 ? Theme.amber : Theme.tertiaryText)
                    Text("\(streak)")
                        .font(.system(size: 22, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.primaryText)
                    Text("DAY\(streak == 1 ? "" : "S")")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Theme.tertiaryText)
                }
            }

            ProgressView(value: min(1, today.study / HistoryStore.dailyStudyGoal))
                .tint(Theme.blue)
                .padding(.top, 12)
        }
    }

    // MARK: Week

    private var weekCard: some View {
        Card {
            CardHeader(title: "This week", trailing: TimeFormatting.compact(week.reduce(0) { $0 + $1.total }))

            HStack(alignment: .bottom, spacing: 8) {
                ForEach(week) { day in
                    VStack(spacing: 6) {
                        ZStack(alignment: .bottom) {
                            RoundedRectangle(cornerRadius: 5)
                                .fill(Theme.surface)
                            VStack(spacing: 2) {
                                Spacer(minLength: 0)
                                if day.pyq > 0 {
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(Theme.amber)
                                        .frame(height: barHeight(day.pyq))
                                }
                                if day.study > 0 {
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(Theme.blue)
                                        .frame(height: barHeight(day.study))
                                }
                            }
                        }
                        .frame(height: 96)

                        Text(day.label.prefix(1))
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Theme.tertiaryText)
                    }
                }
            }
            .padding(.top, 4)

            HStack(spacing: 14) {
                LegendDot(color: Theme.blue, label: "Study")
                LegendDot(color: Theme.amber, label: "PYQ")
                Spacer()
            }
            .padding(.top, 10)
        }
    }

    /// Scaled against the daily goal, not the week's peak — a bar that fills the
    /// track should mean "hit the target", not "did more than Tuesday".
    private func barHeight(_ seconds: TimeInterval) -> CGFloat {
        let fraction = min(1, seconds / HistoryStore.dailyStudyGoal)
        return max(3, CGFloat(96 * fraction))
    }

    // MARK: Screen time (foreign process)

    private var screenTimeCard: some View {
        Card {
            CardHeader(title: "Screen time", trailing: nil)

            DeviceActivityReport(.dailyTotal, filter: filter)
                .frame(minHeight: 220)

            Text("Rendered by iOS. These numbers stay inside Apple's sandbox — Lock In can display them but never read or upload them.")
                .font(.system(size: 11))
                .foregroundStyle(Theme.tertiaryText)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 8)
        }
    }

    /// Matches the app's own day boundary (8am IST) so the two zones describe the
    /// same span of time.
    private var filter: DeviceActivityFilter {
        DeviceActivityFilter(
            segment: .daily(during: DateInterval(start: StudyDay.start(), end: Date())),
            users: .all,
            devices: .init([.iPhone])
        )
    }

    // MARK: Recent

    private var recentCard: some View {
        Card {
            CardHeader(title: "Recent sessions", trailing: nil)

            let sessions = recent
            if sessions.isEmpty {
                Text("No sessions yet. Start one on the Focus tab.")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.tertiaryText)
                    .padding(.vertical, 8)
            } else {
                ForEach(sessions) { record in
                    HStack(spacing: 11) {
                        Image(systemName: record.mode.symbol)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(record.mode.tint)
                            .frame(width: 18)

                        VStack(alignment: .leading, spacing: 1) {
                            Text(record.mode.title)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Theme.primaryText)
                            Text(record.endedAt.formatted(date: .abbreviated, time: .shortened))
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.tertiaryText)
                        }

                        Spacer()

                        if record.wasShielded {
                            Image(systemName: "lock.fill")
                                .font(.system(size: 9))
                                .foregroundStyle(Theme.tertiaryText)
                        }
                        if !record.wasCompleted {
                            Text("early")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(Theme.secondaryText)
                        }
                        Text(TimeFormatting.compact(record.focusedDuration))
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(Theme.primaryText)
                    }
                    .padding(.vertical, 7)

                    if record.persistentModelID != sessions.last?.persistentModelID {
                        Divider().overlay(Theme.hairline)
                    }
                }
            }
        }
    }
}

// MARK: - Small shared pieces

struct Card<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) { content }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                RoundedRectangle(cornerRadius: 20)
                    .fill(Theme.surface)
                    .overlay {
                        RoundedRectangle(cornerRadius: 20).stroke(Theme.surfaceBorder, lineWidth: 1)
                    }
            }
    }
}

struct CardHeader: View {
    let title: String
    let trailing: String?

    var body: some View {
        HStack {
            Text(title)
                .font(Theme.cardTitle)
                .foregroundStyle(Theme.primaryText)
            Spacer()
            if let trailing {
                Text(trailing)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(Theme.secondaryText)
            }
        }
        .padding(.bottom, 12)
    }
}

struct LegendDot: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(Theme.secondaryText)
        }
    }
}
