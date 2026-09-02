import SwiftUI

/// Port of src/components/AddTaskModal.tsx.
struct AddTaskSheet: View {

    @Environment(TaskStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    let initialDate: String?

    @State private var title = ""
    @State private var details = ""
    @State private var dueDate = Date()
    @State private var priority: Priority = .p4
    @State private var saving = false

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !saving
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Title") {
                    TextField("What needs to be done?", text: $title)
                        .submitLabel(.done)
                }

                Section("Description") {
                    TextField("Add details (optional)", text: $details, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Due date") {
                    DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                }

                Section("Priority") {
                    Picker("Priority", selection: $priority) {
                        ForEach(Priority.allCases, id: \.self) { option in
                            Text(option.label).tag(option)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: priority) { _, _ in Haptics.selection() }
                }
            }
            .navigationTitle("New Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        Haptics.light()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Adding…" : "Add") { save() }
                        .disabled(!canSave)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            if let initialDate, let parsed = DayKey.date(from: initialDate) {
                dueDate = parsed
            }
        }
    }

    private func save() {
        guard canSave else { return }
        Haptics.medium()
        saving = true
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedDetails = details.trimmingCharacters(in: .whitespacesAndNewlines)
        let day = DayKey.string(from: dueDate)
        let chosen = priority

        Task {
            await store.add(
                title: trimmedTitle,
                description: trimmedDetails,
                dueDate: day,
                priority: chosen
            )
            saving = false
            dismiss()
        }
    }
}
