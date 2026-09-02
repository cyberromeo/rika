import Foundation

/// OpenCode quota, read through the Vercel function in api/ai-usage.js.
///
/// The proxy exists because the upstream call needs a browser cookie; the app
/// never sees it. When `AI_USAGE_BASE_URL` is unset the service reports "not
/// configured" and the card renders its empty state, which is the same thing the
/// web app does when the proxy fails.
struct AIUsageService: Sendable {

    static let shared = AIUsageService()

    func fetch() async throws -> AIUsage {
        guard let url = AppConfig.aiUsageURL else {
            throw APIError.notConfigured("AI usage endpoint")
        }
        // The function answers 207 when only some windows resolved, which is
        // still usable — APIClient treats 2xx as success, so that arrives here.
        let usage = try await APIClient.shared.get(url, as: AIUsage.self)
        guard !usage.isEmpty else {
            throw APIError.decoding("No usage windows in the response")
        }
        AppGroupCache.save(.aiUsage, usage)
        return usage
    }

    func cached() -> AIUsage? {
        AppGroupCache.load(.aiUsage, as: AIUsage.self)
    }
}
