import Foundation
import Observation

/// Motra gym data. Port of the subscription in src/api/motra.ts:276 plus the
/// state GymPage.tsx and GymRecoveryWidget.tsx keep locally.
@MainActor
@Observable
final class MotraStore {

    private(set) var data: MotraData?
    private(set) var loading = true
    private(set) var errorMessage: String?
    /// True when `data` came from disk rather than the network this session.
    private(set) var isStale = false

    private let service = MotraService.shared

    /// The web app polls every 60s forever, even from screens that show no gym
    /// data. Here the loop is owned by the view's `.task`, so it stops the moment
    /// the screen goes away.
    static let pollInterval: Duration = .seconds(60)

    func load() async {
        if data == nil, let cached = service.cached() {
            data = cached
            isStale = true
            loading = false
        }

        do {
            data = try await service.fetch()
            isStale = false
            errorMessage = nil
        } catch is CancellationError {
        } catch {
            errorMessage = error.localizedDescription
            if data == nil {
                data = service.cached()
                isStale = data != nil
            }
        }
        loading = false
    }

    /// Refresh, then keep refreshing until the caller's task is cancelled.
    func pollLoop() async {
        while !Task.isCancelled {
            await load()
            do {
                try await Task.sleep(for: Self.pollInterval)
            } catch {
                return
            }
        }
    }
}
