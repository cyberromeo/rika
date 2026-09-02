import FamilyControls
import Foundation
import ManagedSettings

/// Persistence for the set of apps, categories and web domains to block.
///
/// `FamilyActivitySelection` holds *opaque tokens*, not bundle identifiers — by
/// design, so an app can shield Instagram without being able to tell that
/// Instagram is installed. The practical consequences run through the whole UI:
/// the only things showable are counts and Apple's own `Label(token)` views, and
/// there is no way to sort, search or name the selection ourselves.
public enum BlocklistStore {

    public static func load() -> FamilyActivitySelection {
        guard let data = AppGroup.defaults.data(forKey: StoreKey.blocklist),
              let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return FamilyActivitySelection() }
        return selection
    }

    public static func save(_ selection: FamilyActivitySelection) {
        guard let data = try? JSONEncoder().encode(selection) else { return }
        AppGroup.defaults.set(data, forKey: StoreKey.blocklist)
    }

    /// Total things blocked, for the "N blocked" affordances. Web domains are
    /// counted because Safari-based distraction is the same problem.
    public static func count(in selection: FamilyActivitySelection? = nil) -> Int {
        let selection = selection ?? load()
        return selection.applicationTokens.count
            + selection.categoryTokens.count
            + selection.webDomainTokens.count
    }

    public static var isEmpty: Bool { count() == 0 }
}

/// The store name is stable and app-specific: `ManagedSettingsStore` settings
/// persist across launches and even reboots, so a named store is what lets the app
/// find and clear its own restrictions later without touching anyone else's.
public extension ManagedSettingsStore.Name {
    static let lockIn = Self("quest.srihari.studytimer.lockIn")
}
