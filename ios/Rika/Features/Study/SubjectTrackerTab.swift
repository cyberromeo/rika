import SwiftUI

/// The Subjects sub-tab: overall bar, seven grand tests, and 19 subject cards of
/// six checkboxes each. Writes are optimistic and sync in the background.
struct SubjectTrackerTab: View {

    @Environment(TrackerStore.self) private var tracker

    var body: some View {
        if tracker.loading && tracker.data == nil {
            LoadingPane(message: "Fetching tracker state from medx…")
        } else if let data = tracker.data {
            List {
                Section {
                    summaryCard(data)
                        .plainRow()
                    grandTestCard(data)
                        .plainRow()
                }

                Section {
                    ForEach(Syllabus.subjects, id: \.self) { subject in
                        subjectCard(subject, data.subject(subject))
                            .plainRow()
                    }
                } header: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("19 Medical Subjects")
                            .font(Typo.title)
                            .foregroundStyle(Palette.text)
                            .textCase(nil)
                        Text("Tap a box to sync progress live")
                            .font(Typo.micro)
                            .foregroundStyle(Palette.hint)
                            .textCase(nil)
                    }
                    .pageInset()
                    .padding(.top, 8)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .refreshable { await tracker.load() }
        }
    }

    // ── Summary ─────────────────────────────────────────────────────────────

    private func summaryCard(_ data: TrackerData) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Overall FMGE Progress").cardTitle()
                Spacer()
                Text("\(data.progressPercent)% (\(data.completedItems)/\(Syllabus.totalItems))")
                    .font(Typo.label)
                    .foregroundStyle(Palette.blue)
            }
            ProgressBar(progress: Double(data.progressPercent) / 100, tint: Palette.blue, height: 8)
        }
        .card()
    }

    // ── Grand tests ─────────────────────────────────────────────────────────

    private func grandTestCard(_ data: TrackerData) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.orange)
                    Text("Grand Tests").cardTitle()
                }
                Spacer()
                Text("\(data.completedGTs) / 7 Completed")
                    .font(Typo.micro)
                    .foregroundStyle(Palette.hint)
            }

            HStack(spacing: 6) {
                ForEach(Array(Syllabus.grandTests.enumerated()), id: \.element) { index, gt in
                    let checked = data.gts[gt] ?? false
                    Button {
                        Task { await tracker.toggle(grandTest: gt) }
                    } label: {
                        VStack(spacing: 4) {
                            ZStack {
                                Circle()
                                    .fill(checked ? Palette.green : Color.white.opacity(0.07))
                                    .frame(width: 28, height: 28)
                                if checked {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundStyle(.black)
                                } else {
                                    Text("\(index + 1)")
                                        .font(Typo.label)
                                        .foregroundStyle(Palette.hint)
                                }
                            }
                            Text("GT \(index + 1)")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(checked ? Palette.green : Palette.hint)
                        }
                        .frame(maxWidth: .infinity)
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .card()
    }

    // ── Subject card ────────────────────────────────────────────────────────

    private func subjectCard(_ subject: String, _ data: TrackerSubject) -> some View {
        let done = data.completedCount
        let total = SubjectField.allCases.count

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(subject)
                    .font(Typo.title)
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                Spacer()
                Text("\(done)/\(total)")
                    .font(Typo.micro)
                    .foregroundStyle(done == total ? Palette.green : Palette.hint)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(
                        Capsule().fill(
                            (done == total ? Palette.green : Color.white).opacity(done == total ? 0.14 : 0.06)
                        )
                    )
            }

            ProgressBar(
                progress: Double(done) / Double(total),
                tint: done == total ? Palette.green : Palette.blue,
                height: 4
            )

            // Two rows of three: six labels do not fit legibly on one line at
            // any iPhone width.
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 3),
                spacing: 6
            ) {
                ForEach(SubjectField.allCases) { field in
                    fieldButton(subject: subject, field: field, checked: data[field])
                }
            }
        }
        .card()
    }

    private func fieldButton(subject: String, field: SubjectField, checked: Bool) -> some View {
        Button {
            Task { await tracker.toggle(subject: subject, field: field) }
        } label: {
            HStack(spacing: 5) {
                ZStack {
                    RoundedRectangle(cornerRadius: 4)
                        .strokeBorder(checked ? Palette.green : Palette.surfaceBorderStrong, lineWidth: 1.4)
                        .frame(width: 15, height: 15)
                    if checked {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Palette.green)
                            .frame(width: 15, height: 15)
                        Image(systemName: "checkmark")
                            .font(.system(size: 8, weight: .black))
                            .foregroundStyle(.black)
                    }
                }
                Text(field.label)
                    .font(.system(size: 10, weight: .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 0)
            }
            .foregroundStyle(checked ? Palette.text : Palette.hint)
            .padding(.vertical, 7)
            .padding(.horizontal, 7)
            .background(
                RoundedRectangle(cornerRadius: Metrics.radiusSmall)
                    .fill(Color.white.opacity(checked ? 0.07 : 0.03))
            )
            .contentShape(.rect(cornerRadius: Metrics.radiusSmall))
        }
        .buttonStyle(.plain)
    }
}

extension View {
    /// A List row with no chrome of its own — the card provides all of it.
    func plainRow() -> some View {
        self
            .pageInset()
            .listRowInsets(EdgeInsets(top: 5, leading: 0, bottom: 5, trailing: 0))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }
}
