import FamilyControls
import SwiftUI

/// Choosing what gets blocked.
///
/// The whole screen is shaped by one privacy constraint: `FamilyActivitySelection`
/// holds opaque tokens, so this app cannot see which apps were picked. No names, no
/// icons, no bundle IDs, no way to build a custom list UI. Apple's own picker is
/// the only thing that can render them, so the app shows counts and defers to it —
/// pretending otherwise would mean a screen full of "Unknown app".
struct BlocklistView: View {
    @Environment(AuthorizationService.self) private var auth
    @Environment(SessionEngine.self) private var engine

    @State private var selection = BlocklistStore.load()
    @State private var isPickerPresented = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if auth.isAuthorized {
                        summaryCard
                        pickerButton
                        explainer
                    } else {
                        AuthorizationGate()
                    }
                }
                .padding(20)
            }
            .background(Theme.background)
            .navigationTitle("Blocklist")
            .navigationBarTitleDisplayMode(.large)
            .scrollContentBackground(.hidden)
        }
        .familyActivityPicker(isPresented: $isPickerPresented, selection: $selection)
        .onChange(of: selection) { _, new in
            BlocklistStore.save(new)
            // A session already running keeps the shield it started with; changing
            // the list mid-session would silently unblock something.
        }
    }

    private var summaryCard: some View {
        VStack(spacing: 18) {
            HStack(spacing: 24) {
                CountTile(value: selection.applicationTokens.count, label: "Apps")
                CountTile(value: selection.categoryTokens.count, label: "Categories")
                CountTile(value: selection.webDomainTokens.count, label: "Sites")
            }

            if engine.isActive {
                Label("Active now — changes apply to your next session", systemImage: "lock.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(engine.mode.tint)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 22)
        .background {
            RoundedRectangle(cornerRadius: 22)
                .fill(Theme.surface)
                .overlay {
                    RoundedRectangle(cornerRadius: 22).stroke(Theme.surfaceBorder, lineWidth: 1)
                }
        }
    }

    private var pickerButton: some View {
        Button {
            isPickerPresented = true
        } label: {
            Label(BlocklistStore.count(in: selection) == 0 ? "Choose apps to block" : "Edit selection",
                  systemImage: "square.grid.2x2")
                .font(.system(size: 15, weight: .semibold))
                .frame(height: 52)
                .frame(maxWidth: .infinity)
                .contentShape(.capsule)
        }
        .buttonStyle(.glassProminent)
        .tint(Theme.blue)
    }

    private var explainer: some View {
        VStack(alignment: .leading, spacing: 12) {
            InfoRow(
                icon: "eye.slash",
                text: "Lock In can't see which apps you pick — iOS hands it sealed tokens, not names."
            )
            InfoRow(
                icon: "checkmark.shield",
                text: "Blocking only applies during a Study or PYQ session. Breaks never block anything."
            )
            InfoRow(
                icon: "arrow.counterclockwise",
                text: "If the app crashes mid-session, iOS lifts the block on its own at the session's end time."
            )
        }
        .padding(16)
        .background {
            RoundedRectangle(cornerRadius: 18).fill(Theme.surface.opacity(0.6))
        }
    }
}

private struct CountTile: View {
    let value: Int
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.system(size: 30, weight: .semibold, design: .rounded))
                .foregroundStyle(value > 0 ? Theme.primaryText : Theme.tertiaryText)
                .contentTransition(.numericText())
            Text(label.uppercased())
                .font(Theme.eyebrow)
                .foregroundStyle(Theme.tertiaryText)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct InfoRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 11) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.secondaryText)
                .frame(width: 16)
            Text(text)
                .font(.system(size: 12.5))
                .foregroundStyle(Theme.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
