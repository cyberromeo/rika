import SwiftUI

/// Port of src/components/ShoppingCartPanel.tsx.
///
/// Sources its rows from whichever Todoist section is named "Shopping", falling
/// back to a label match — the same two-step the web panel uses so the list still
/// works if the section is renamed.
struct ShoppingCartSheet: View {

    @Environment(TaskStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private var pending: [TodoTask] { store.shoppingPending }
    private var bought: [TodoTask] { store.shoppingBought }

    var body: some View {
        NavigationStack {
            Group {
                if pending.isEmpty && bought.isEmpty {
                    EmptyPane(
                        symbol: "cart",
                        title: "Cart is empty",
                        message: "Tasks in your Shopping Cart section will appear here."
                    )
                    .frame(maxHeight: .infinity)
                } else {
                    List {
                        if !pending.isEmpty {
                            Section("To get · \(pending.count)") {
                                ForEach(pending) { item in row(item) }
                            }
                        }
                        if !bought.isEmpty {
                            Section("Got it · \(bought.count)") {
                                ForEach(bought) { item in row(item) }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Palette.bg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 1) {
                        Text("Shopping Cart").font(Typo.title)
                        Text("\(pending.count) item\(pending.count == 1 ? "" : "s") to get")
                            .font(Typo.micro)
                            .foregroundStyle(Palette.hint)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        Haptics.light()
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func row(_ item: TodoTask) -> some View {
        HStack(spacing: 12) {
            Button {
                Haptics.light()
                if !item.completed { Haptics.success() }
                Task { await store.toggle(item.id) }
            } label: {
                Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(item.completed ? Palette.green : Palette.hint)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(item.completed ? "Mark as not bought" : "Mark as bought")

            Text(item.title)
                .font(Typo.body)
                .foregroundStyle(item.completed ? Palette.hint : Palette.text)
                .strikethrough(item.completed, color: Palette.hint)

            Spacer(minLength: 0)

            if let due = item.due {
                let overdue = !item.completed && due < DayKey.startOfDay(Date())
                Text(DateDisplay.dueLabel(due))
                    .font(Typo.micro)
                    .foregroundStyle(overdue ? Palette.red : Palette.hint)
            }
        }
        .listRowBackground(Palette.bgSecondary)
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                Haptics.medium()
                Task { await store.delete(item.id) }
            } label: {
                Label("Remove", systemImage: "trash")
            }
        }
    }
}
