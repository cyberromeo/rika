import SwiftUI
import UIKit

/// Haptics, mapped from `src/telegram.ts` so the call sites keep their meaning:
/// `light` on selection and navigation, `medium` on a committing action,
/// `heavy` on timer completion, plus the success/error notification pair.
///
/// Generators are created per call rather than kept warm: `prepare()` costs a
/// running Taptic session, and these fire at human tap rates where the extra
/// latency is imperceptible.
enum Haptics {

    /// `hapticFeedback('light' | 'medium' | 'heavy')`
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        guard enabled else { return }
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }

    static func light() { impact(.light) }
    static func medium() { impact(.medium) }
    static func heavy() { impact(.heavy) }

    /// `hapticSelection()`
    static func selection() {
        guard enabled else { return }
        UISelectionFeedbackGenerator().selectionChanged()
    }

    /// `hapticNotification('success' | 'error' | 'warning')`
    static func notify(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        guard enabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(type)
    }

    static func success() { notify(.success) }
    static func failure() { notify(.error) }

    /// Extensions have no business vibrating the device, and a widget timeline
    /// runs in one.
    private static var enabled: Bool {
        Bundle.main.bundlePath.hasSuffix(".appex") == false
    }
}
