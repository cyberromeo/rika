import Foundation

/// medx study-time service: today's totals, the weekly breakdown, the todo list,
/// and the cloud timer. Port of src/api/studytime.ts.
struct StudyTimeService: Sendable {

    static let shared = StudyTimeService()

    private func baseURL() throws -> URL {
        guard let base = AppConfig.medxBaseURL else { throw APIError.notConfigured("medx URL") }
        return base.appendingPathComponent("studytime")
    }

    private func password() throws -> String {
        guard let password = AppSecrets.studytimePassword, !password.isEmpty else {
            throw APIError.notConfigured("studytime password")
        }
        return password
    }

    // ── Read ────────────────────────────────────────────────────────────────

    func fetch() async throws -> StudyTimeState {
        guard var comps = URLComponents(url: try baseURL(), resolvingAgainstBaseURL: false) else {
            throw APIError.badURL
        }
        comps.queryItems = [URLQueryItem(name: "password", value: try password())]
        guard let url = comps.url else { throw APIError.badURL }

        let response = try await APIClient.shared.get(url, as: StudyTimeResponse.self)
        guard response.success, let state = response.state else {
            throw APIError.decoding("studytime returned success=false")
        }
        AppGroupCache.save(.studytime, state)
        return state
    }

    func cached() -> StudyTimeState? {
        AppGroupCache.load(.studytime, as: StudyTimeState.self)
    }

    // ── Write ───────────────────────────────────────────────────────────────

    /// One request shape for all twelve actions. `JSONEncoder` drops nil
    /// members, so each action sends exactly the fields it needs.
    private struct ActionRequest: Encodable {
        let password: String
        let action: String
        var seconds: Int?
        var mode: String?
        var note: String?
        var durationSeconds: Int?
        var goalSeconds: Int?
        var pyqGoalSeconds: Int?
        var text: String?
        var id: String?
    }

    @discardableResult
    private func post(_ request: ActionRequest) async throws -> StudyTimeState {
        let response = try await APIClient.shared.post(
            try baseURL(),
            body: request,
            as: StudyTimeResponse.self
        )
        guard response.success, let state = response.state else {
            throw APIError.decoding("studytime rejected \(request.action)")
        }
        AppGroupCache.save(.studytime, state)
        return state
    }

    private func request(_ action: StudyAction) throws -> ActionRequest {
        ActionRequest(password: try password(), action: action.rawValue)
    }

    /// Adds elapsed seconds to today's total. A break is logged as study time,
    /// matching what the web app does before calling this.
    @discardableResult
    func log(seconds: Int, mode: TimerMode, note: String) async throws -> StudyTimeState {
        var req = try request(.log)
        req.seconds = seconds
        req.mode = mode.loggedAs.rawValue
        req.note = note
        return try await post(req)
    }

    @discardableResult
    func startTimer(durationSeconds: Int, mode: TimerMode, note: String) async throws -> StudyTimeState {
        var req = try request(.startTimer)
        req.durationSeconds = durationSeconds
        req.mode = mode.rawValue
        req.note = note
        return try await post(req)
    }

    @discardableResult
    func pauseTimer() async throws -> StudyTimeState { try await post(try request(.pauseTimer)) }

    @discardableResult
    func resumeTimer() async throws -> StudyTimeState { try await post(try request(.resumeTimer)) }

    @discardableResult
    func cancelTimer() async throws -> StudyTimeState { try await post(try request(.cancelTimer)) }

    @discardableResult
    func setStudyGoal(seconds: Int) async throws -> StudyTimeState {
        var req = try request(.setGoal)
        req.goalSeconds = seconds
        return try await post(req)
    }

    @discardableResult
    func setPyqGoal(seconds: Int) async throws -> StudyTimeState {
        var req = try request(.setPyqGoal)
        req.pyqGoalSeconds = seconds
        return try await post(req)
    }

    @discardableResult
    func resetToday() async throws -> StudyTimeState { try await post(try request(.resetToday)) }

    @discardableResult
    func addTodo(_ text: String) async throws -> StudyTimeState {
        var req = try request(.addTodo)
        req.text = text
        return try await post(req)
    }

    @discardableResult
    func toggleTodo(id: String) async throws -> StudyTimeState {
        var req = try request(.toggleTodo)
        req.id = id
        return try await post(req)
    }

    @discardableResult
    func deleteTodo(id: String) async throws -> StudyTimeState {
        var req = try request(.deleteTodo)
        req.id = id
        return try await post(req)
    }

    @discardableResult
    func clearCompletedTodos() async throws -> StudyTimeState {
        try await post(try request(.clearTodos))
    }
}
