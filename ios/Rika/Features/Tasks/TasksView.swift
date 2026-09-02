import SwiftUI

/// Port of src/pages/TasksPage.tsx.
///
/// Built on `List` rather than a `LazyVStack` of cards: rows are reused cells, so
/// a few hundred tasks scroll without keeping every row that has passed by alive.
struct TasksView: View {

    @Environment(TaskStore.self) private var store

    @State private var addSheetOpen = false
    @State private var cartOpen = false
    @State private var addSheetDate: String?

    private var buckets: TaskStore.Buckets { store.buckets }

    var body: some View {
        NavigationStack {
            content
                .background(Palette.bg)
                .navigationTitle("Tasks")
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        cartButton
                    }
                }
                .overlay(alignment: .bottomTrailing) { fab }
                .sheet(isPresented: $addSheetOpen) {
                    AddTaskSheet(initialDate: addSheetDate)
                }
                .sheet(isPresented: $cartOpen) {
                    ShoppingCartSheet()
                }
                .refreshable { await store.load() }
        }
    }

    // ── Content ─────────────────────────────────────────────────────────────

    @ViewBuilder
    private var content: some View {
        if store.loading && store.tasks.isEmpty {
            LoadingPane(message: "Fetching your tasks")
        } else if let error = store.errorMessage, store.tasks.isEmpty {
            ErrorPane(message: error) { Task { await store.load() } }
        } else {
            List {
                Section {
                    HStack(spacing: 8) {
                        StatChip(
                            value: "\(buckets.overdue.count)",
                            label: "Overdue",
                            tint: buckets.overdue.isEmpty ? Palette.text : Palette.red
                        )
                        StatChip(value: "\(buckets.today.count)", label: "Today")
                        StatChip(value: "\(buckets.upcoming.count)", label: "Upcoming")
                    }
                    .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 8, trailing: 0))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                } header: {
                    Text("\(buckets.activeCount) active · \(buckets.completed.count) completed")
                        .font(Typo.label)
                        .foregroundStyle(Palette.hint)
                        .textCase(nil)
                }

                if buckets.isEmpty {
                    Section {
                        EmptyPane(
                            symbol: "checkmark.circle",
                            title: "All clear!",
                            message: "No tasks yet. Tap + to create your first task."
                        )
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }
                } else {
                    bucketSection("Overdue", buckets.overdue, tint: Palette.red)
                    bucketSection("Today", buckets.today, showDate: false)
                    bucketSection("Upcoming", buckets.upcoming)
                    bucketSection("Completed", buckets.completed)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .environment(\.defaultMinListRowHeight, 0)
        }
    }

    @ViewBuilder
    private func bucketSection(
        _ title: String,
        _ tasks: [TodoTask],
        showDate: Bool = true,
        tint: Color = Palette.hint
    ) -> some View {
        if !tasks.isEmpty {
            Section {
                ForEach(tasks) { task in
                    TaskRow(task: task, showDate: showDate)
                        .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }
            } header: {
                Text("\(title) · \(tasks.count)")
                    .font(Typo.micro)
                    .textCase(.uppercase)
                    .tracking(Typo.trackingWide)
                    .foregroundStyle(tint)
            }
        }
    }

    // ── Chrome ──────────────────────────────────────────────────────────────

    private var cartButton: some View {
        Button {
            Haptics.medium()
            cartOpen = true
        } label: {
            Image(systemName: "cart")
                .overlay(alignment: .topTrailing) {
                    if store.shoppingCount > 0 {
                        Text("\(store.shoppingCount)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(3)
                            .background(Circle().fill(Palette.red))
                            .offset(x: 8, y: -8)
                    }
                }
        }
        .accessibilityLabel("Open shopping cart, \(store.shoppingCount) items")
    }

    /// One of the five places Liquid Glass is used. `contentShape` matters here:
    /// without it only the glyph is tappable, not the glass pill around it.
    private var fab: some View {
        GlassEffectContainer {
            Button {
                Haptics.medium()
                addSheetDate = nil
                addSheetOpen = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(Palette.blue)
                    .frame(width: 56, height: 56)
            }
            .glassEffect(.regular.interactive(), in: .circle)
            .contentShape(.circle)
            .accessibilityLabel("Add new task")
        }
        .padding(.trailing, Metrics.pageInset)
        .padding(.bottom, 12)
    }
}
