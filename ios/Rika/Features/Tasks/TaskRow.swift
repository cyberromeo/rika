import SwiftUI

/// Port of src/components/TaskItem.tsx.
///
/// The web row carries a permanently visible delete button because a WebView has
/// no swipe affordance. Native gets `swipeActions`, so the row is just content
/// and the destructive action stays behind a deliberate gesture.
struct TaskRow: View {

    @Environment(TaskStore.self) private var store
    let task: TodoTask
    var showDate: Bool = true

    /// Brief local flag so the checkmark animates before the list reorders,
    /// matching the 400 ms hold the web row uses.
    @State private var completing = false

    private var isOverdue: Bool {
        guard !task.completed, let due = task.due else { return false }
        return due < DayKey.startOfDay(Date())
    }

    private var accent: Color {
        switch task.priority {
        case .p1: return Palette.p1
        case .p2: return Palette.p2
        case .p3: return Palette.p3
        case .p4: return Palette.p4
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            checkbox

            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(Typo.body)
                    .foregroundStyle(task.completed ? Palette.hint : Palette.text)
                    .strikethrough(task.completed, color: Palette.hint)

                if !task.description.isEmpty {
                    Text(task.description)
                        .font(Typo.label)
                        .foregroundStyle(Palette.hint)
                        .lineLimit(2)
                }

                if !task.labels.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(task.labels, id: \.self) { label in
                            Text("@\(label)")
                                .font(Typo.micro)
                                .foregroundStyle(Palette.blue)
                        }
                    }
                }

                if showDate, let due = task.due {
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.system(size: 9, weight: .semibold))
                        Text(DateDisplay.dueLabel(due))
                        if task.isRecurring {
                            Image(systemName: "repeat")
                                .font(.system(size: 9, weight: .semibold))
                        }
                    }
                    .font(Typo.micro)
                    .foregroundStyle(isOverdue ? Palette.red : Palette.hint)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(
                        Capsule().fill(
                            (isOverdue ? Palette.red : Color.white).opacity(isOverdue ? 0.12 : 0.05)
                        )
                    )
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, Metrics.cardPadding)
        .background(alignment: .leading) {
            // The priority stripe the CSS paints with a left border.
            Rectangle()
                .fill(accent)
                .frame(width: 3)
                .opacity(task.completed ? 0.3 : 1)
        }
        .background(Palette.surfaceGradient)
        .clipShape(.rect(cornerRadius: Metrics.radiusMedium))
        .overlay {
            RoundedRectangle(cornerRadius: Metrics.radiusMedium)
                .strokeBorder(Palette.surfaceBorder, lineWidth: 1)
        }
        .opacity(task.completed ? 0.6 : 1)
        .pageInset()
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                Haptics.medium()
                Task { await store.delete(task.id) }
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                toggle()
            } label: {
                Label(
                    task.completed ? "Reopen" : "Complete",
                    systemImage: task.completed ? "arrow.uturn.backward" : "checkmark"
                )
            }
            .tint(task.completed ? Palette.orange : Palette.green)
        }
    }

    private var checkbox: some View {
        Button {
            toggle()
        } label: {
            ZStack {
                Circle()
                    .strokeBorder(accent, lineWidth: 1.6)
                    .frame(width: 22, height: 22)
                if task.completed || completing {
                    Circle().fill(accent).frame(width: 22, height: 22)
                    Image(systemName: "checkmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.black)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(task.completed ? "Mark as incomplete" : "Mark as complete")
    }

    private func toggle() {
        Haptics.light()
        if !task.completed {
            Haptics.success()
            completing = true
        }
        Task {
            await store.toggle(task.id)
            completing = false
        }
    }
}
