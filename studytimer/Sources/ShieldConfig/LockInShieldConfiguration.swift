import ManagedSettings
import ManagedSettingsUI
import UIKit

/// The screen shown when a shielded app is opened mid-session.
///
/// This is the only UI in the whole project that gets seen at the exact moment of
/// temptation, so it's worth more care than its twenty lines suggest. It reads the
/// live session out of the shared app group to show real remaining time — a
/// generic "blocked" message invites a second attempt, a specific "37 minutes left"
/// mostly doesn't.
///
/// Deliberately offers no way out. There's no secondary "unlock" button, because
/// an escape hatch one tap from the distraction defeats the point; ending early
/// means opening Lock In and holding the button down.
///
/// Class name must match `NSExtensionPrincipalClass` in `Support/ShieldConfig-Info.plist`.
final class LockInShieldConfiguration: ShieldConfigurationDataSource {

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        shield()
    }

    override func configuration(
        shielding application: Application,
        in category: ActivityCategory
    ) -> ShieldConfiguration {
        shield()
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        shield()
    }

    override func configuration(
        shielding webDomain: WebDomain,
        in category: ActivityCategory
    ) -> ShieldConfiguration {
        shield()
    }

    // MARK: - Appearance

    private func shield() -> ShieldConfiguration {
        let session = SessionStore.activeSession()

        return ShieldConfiguration(
            // No blur: pure black reads as intentional on OLED, where a blurred
            // screenshot of Instagram would read as a glitch.
            backgroundBlurStyle: nil,
            backgroundColor: .black,
            icon: Self.icon,
            title: ShieldConfiguration.Label(
                text: session?.mode == .pyq ? "PYQs in progress" : "You're locked in",
                color: .white
            ),
            subtitle: ShieldConfiguration.Label(
                text: Self.subtitle(for: session),
                color: UIColor(white: 0.62, alpha: 1)
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Back to studying",
                color: .white
            ),
            primaryButtonBackgroundColor: UIColor(red: 0.04, green: 0.52, blue: 1, alpha: 1)
        )
    }

    private static func subtitle(for session: Session?) -> String {
        guard let session else {
            // Shield outlived its session. The orphan sweep will clear it, but the
            // user shouldn't be told "0 minutes left" in the meantime.
            return "This session is over — reopen Lock In to clear the block."
        }
        if session.state == .paused {
            return "Paused. Reopen Lock In to carry on or finish up."
        }
        let remaining = TimeFormatting.remainingPhrase(session.remaining())
        return "\(session.mode.title) session · \(remaining)"
    }

    /// Drawn from an SF Symbol rather than an asset, so the extension needs no
    /// asset catalog of its own.
    private static var icon: UIImage? {
        let config = UIImage.SymbolConfiguration(pointSize: 44, weight: .semibold)
            .applying(UIImage.SymbolConfiguration(paletteColors: [.white]))
        return UIImage(systemName: "lock.fill", withConfiguration: config)
    }
}
