import Foundation
import Testing

/// The 8am IST rollover. This has to agree with `getStudyDayAnchor` in
/// `api/studytime.js` exactly — a disagreement means the iOS streak and the web
/// app's streak drift apart, which is worse than either being wrong alone.
struct StudyDayTests {

    /// Builds a Date from an IST wall-clock time.
    private func ist(_ year: Int, _ month: Int, _ day: Int, _ hour: Int, _ minute: Int = 0) -> Date {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        components.hour = hour
        components.minute = minute
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = StudyDay.timeZone
        return calendar.date(from: components)!
    }

    @Test func middayBelongsToTheSameDay() {
        #expect(StudyDay.anchor(for: ist(2026, 9, 2, 14)) == "2026-09-02")
    }

    @Test func eightAmIsTheStartOfTheNewDay() {
        #expect(StudyDay.anchor(for: ist(2026, 9, 2, 8, 0)) == "2026-09-02")
    }

    /// The case the whole rule exists for: studying past midnight still counts
    /// toward the day you started.
    @Test func afterMidnightBelongsToThePreviousDay() {
        #expect(StudyDay.anchor(for: ist(2026, 9, 3, 2, 30)) == "2026-09-02")
    }

    @Test func justBeforeRolloverStillBelongsToThePreviousDay() {
        #expect(StudyDay.anchor(for: ist(2026, 9, 3, 7, 59)) == "2026-09-02")
    }

    @Test func rolloverAcrossMonthBoundary() {
        #expect(StudyDay.anchor(for: ist(2026, 10, 1, 3)) == "2026-09-30")
    }

    @Test func rolloverAcrossYearBoundary() {
        #expect(StudyDay.anchor(for: ist(2027, 1, 1, 4)) == "2026-12-31")
    }

    @Test func startOfDayIsEightAmOnTheAnchorDate() {
        let start = StudyDay.start(of: ist(2026, 9, 3, 2))
        #expect(start == ist(2026, 9, 2, 8))
    }

    @Test func recentAnchorsAreOldestFirstAndEndToday() {
        let anchors = StudyDay.recentAnchors(count: 3, from: ist(2026, 9, 2, 14))
        #expect(anchors == ["2026-08-31", "2026-09-01", "2026-09-02"])
    }

    @Test func weekdayLabelIsStable() {
        // 2026-09-02 is a Wednesday.
        #expect(StudyDay.weekdayLabel(for: "2026-09-02") == "Wed")
    }
}
