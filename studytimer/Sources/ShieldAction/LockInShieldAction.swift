import ManagedSettings
import UIKit

/// Handles the shield screen's buttons.
///
/// Only the primary button exists, and it closes the blocked app rather than
/// unlocking anything — see `LockInShieldConfiguration` for why. The one case that
/// does clear restrictions is the orphan: if the session has already ended and the
/// monitor hasn't caught up, tapping the button shouldn't strand the user.
///
/// Class name must match `NSExtensionPrincipalClass` in `Support/ShieldAction-Info.plist`.
final class LockInShieldAction: ShieldActionDelegate {

    override func handle(
        action: ShieldAction,
        for application: ApplicationToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        completionHandler(respond(to: action))
    }

    override func handle(
        action: ShieldAction,
        for webDomain: WebDomainToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        completionHandler(respond(to: action))
    }

    override func handle(
        action: ShieldAction,
        for category: ActivityCategoryToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        completionHandler(respond(to: action))
    }

    private func respond(to action: ShieldAction) -> ShieldActionResponse {
        // A shield with no live session behind it is a bug, not a rule. Clear it
        // rather than making the user work out that they need to reopen the app.
        if SessionStore.hasOrphanedShield() {
            ShieldController.clear()
            return .defer
        }

        switch action {
        case .primaryButtonPressed:
            // Dismiss the blocked app and go back to the home screen.
            return .close
        // Plain `default` rather than `@unknown default`: ShieldAction carries a case
        // beyond the two buttons, and anything that isn't the primary button should
        // leave the shield exactly where it is.
        default:
            return .defer
        }
    }
}
