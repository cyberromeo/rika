import FamilyControls
import Foundation
import Observation

/// Wrapper around `AuthorizationCenter`, the gate in front of the entire Screen
/// Time API. Nothing in `ManagedSettings` or `DeviceActivity` does anything until
/// this succeeds.
@MainActor
@Observable
public final class AuthorizationService {
    public enum Failure: LocalizedError, Equatable {
        /// The account can't use Screen Time — most often a managed/child account,
        /// or a device with Screen Time disabled entirely.
        case ineligibleAccount
        case declined
        case simulator
        case other(String)

        public var errorDescription: String? {
            switch self {
            case .ineligibleAccount:
                "This Apple Account can't use Screen Time controls. Check Settings › Screen Time is switched on."
            case .declined:
                "Lock In needs Screen Time access to block apps during a session."
            case .simulator:
                "Screen Time only works on a real device — the Simulator can't authorize it."
            case .other(let message):
                message
            }
        }
    }

    public private(set) var status: AuthorizationStatus
    public private(set) var lastFailure: Failure?
    public private(set) var isRequesting = false

    public var isAuthorized: Bool { status == .approved }

    public init() {
        status = AuthorizationCenter.shared.authorizationStatus
    }

    public func refresh() {
        status = AuthorizationCenter.shared.authorizationStatus
    }

    /// Requests authorization for the device's own owner.
    ///
    /// `.individual` is what makes a self-control app possible: on iOS 15 the only
    /// option was `.child`, which required the device to be in a Family Sharing
    /// group under a parent. The user is prompted for their Screen Time passcode.
    @discardableResult
    public func request() async -> Bool {
        #if targetEnvironment(simulator)
        lastFailure = .simulator
        return false
        #else
        isRequesting = true
        defer { isRequesting = false }

        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            refresh()
            lastFailure = status == .approved ? nil : .declined
            return status == .approved
        } catch {
            refresh()
            lastFailure = Self.classify(error)
            return false
        }
        #endif
    }

    /// Hands authorization back. Also the user's escape hatch if the app ever
    /// misbehaves, so it's surfaced in Settings rather than buried.
    public func revoke() {
        AuthorizationCenter.shared.revokeAuthorization { [weak self] _ in
            Task { @MainActor in self?.refresh() }
        }
    }

    private static func classify(_ error: Error) -> Failure {
        if let familyError = error as? FamilyControlsError {
            switch familyError {
            case .invalidAccountType: return .ineligibleAccount
            case .authorizationCanceled, .authorizationConflict: return .declined
            case .restricted: return .ineligibleAccount
            default: return .other(familyError.localizedDescription)
            }
        }
        return .other(error.localizedDescription)
    }
}
