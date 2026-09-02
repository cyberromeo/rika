import SwiftUI

/// `.page-header` — an h1 plus a subtitle, on every screen.
struct PageHeader<Trailing: View>: View {
    let title: String
    let subtitle: String?
    @ViewBuilder var trailing: Trailing

    init(_ title: String, subtitle: String? = nil, @ViewBuilder trailing: () -> Trailing = { EmptyView() }) {
        self.title = title
        self.subtitle = subtitle
        self.trailing = trailing()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(title)
                    .font(Typo.pageTitle)
                    .tracking(Typo.trackingTight)
                    .foregroundStyle(Palette.text)
                Spacer(minLength: 8)
                trailing
            }
            if let subtitle {
                Text(subtitle)
                    .font(Typo.pageSubtitle)
                    .foregroundStyle(Palette.hint)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .pageInset()
        .padding(.top, 8)
        .padding(.bottom, 16)
    }
}

/// `.study-segmented-nav` — the sub-tab control on Study and Gym.
///
/// One of the five places glass is allowed: it is a navigation control that
/// floats over scrolling content.
///
/// The generic is `Item`, not `Tab`, because `SwiftUI.Tab` exists on iOS 26 and
/// shadowing it inside this type would be a trap for the next reader.
struct SubTabBar<Item: Hashable & Identifiable>: View {
    let tabs: [Item]
    @Binding var selection: Item
    let label: (Item) -> String
    let symbol: (Item) -> String

    var body: some View {
        HStack(spacing: 4) {
            ForEach(tabs) { tab in
                let isActive = tab == selection
                Button {
                    guard tab != selection else { return }
                    Haptics.light()
                    withAnimation(.easeOut(duration: 0.18)) { selection = tab }
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: symbol(tab))
                            .font(.system(size: 11, weight: .semibold))
                        Text(label(tab))
                            .font(Typo.label)
                            .lineLimit(1)
                            .minimumScaleFactor(0.85)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .foregroundStyle(isActive ? Palette.text : Palette.hint)
                    .background {
                        if isActive {
                            Capsule().fill(Color.white.opacity(0.10))
                        }
                    }
                    .contentShape(.capsule)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .glassEffect(.regular, in: .capsule)
        .pageInset()
    }
}

/// `.stat-chip` — the three-up count row on Tasks.
struct StatChip: View {
    let value: String
    let label: String
    var tint: Color = Palette.text

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(Typo.numeral(20))
                .foregroundStyle(tint)
            Text(label)
                .eyebrow()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .card(padding: 0, radius: Metrics.radiusMedium)
    }
}
