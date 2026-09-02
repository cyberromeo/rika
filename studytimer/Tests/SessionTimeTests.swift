import Foundation
import Testing

/// The remaining-time maths, which is the one piece of logic in the project that's
/// both easy to get wrong and impossible to check by looking at the screen. Every
/// case here is a bug that would show up as a countdown quietly disagreeing with
/// reality after a pause.
struct SessionTimeTests {
    private let start = Date(timeIntervalSince1970: 1_000_000)

    private func session(minutes: Int = 60) -> Session {
        Session(mode: .study, plannedDuration: TimeInterval(minutes * 60), startedAt: start)
    }

    @Test func freshSessionHasFullDurationRemaining() {
        let s = session(minutes: 60)
        #expect(s.remaining(at: start) == 3600)
        #expect(s.progress(at: start) == 0)
    }

    @Test func elapsedTracksWallClockWhileRunning() {
        let s = session()
        let tenMinutesIn = start.addingTimeInterval(600)
        #expect(s.elapsed(at: tenMinutesIn) == 600)
        #expect(s.remaining(at: tenMinutesIn) == 3000)
    }

    @Test func pauseFreezesTheClock() {
        let paused = session().paused(at: start.addingTimeInterval(600))
        // Half an hour later, still 50 minutes left.
        let muchLater = start.addingTimeInterval(600 + 1800)
        #expect(paused.elapsed(at: muchLater) == 600)
        #expect(paused.remaining(at: muchLater) == 3000)
    }

    @Test func resumeAbsorbsPausedTimeWithoutLosingProgress() {
        let pausedAt = start.addingTimeInterval(600)
        let resumedAt = pausedAt.addingTimeInterval(300)  // 5 min break
        let resumed = session().paused(at: pausedAt).resumed(at: resumedAt)

        #expect(resumed.pausedTotal == 300)
        #expect(resumed.elapsed(at: resumedAt) == 600)
        // One more minute of work → 11 minutes elapsed, not 16.
        #expect(resumed.elapsed(at: resumedAt.addingTimeInterval(60)) == 660)
    }

    @Test func multiplePauseCyclesAccumulate() {
        var s = session()
        var cursor = start
        for _ in 0..<3 {
            cursor = cursor.addingTimeInterval(300)          // work 5 min
            s = s.paused(at: cursor)
            cursor = cursor.addingTimeInterval(120)          // pause 2 min
            s = s.resumed(at: cursor)
        }
        #expect(s.pausedTotal == 360)
        #expect(s.elapsed(at: cursor) == 900)
    }

    @Test func projectedEndShiftsForwardByPausedTime() {
        let pausedAt = start.addingTimeInterval(600)
        let resumed = session().paused(at: pausedAt).resumed(at: pausedAt.addingTimeInterval(300))
        #expect(resumed.projectedEnd == start.addingTimeInterval(3600 + 300))
    }

    @Test func expiryIsDetectedOnlyForRunningSessions() {
        let s = session(minutes: 1)
        #expect(s.hasExpired(at: start.addingTimeInterval(61)))
        #expect(!s.paused(at: start.addingTimeInterval(30)).hasExpired(at: start.addingTimeInterval(600)))
    }

    @Test func remainingNeverGoesNegative() {
        let s = session(minutes: 1)
        #expect(s.remaining(at: start.addingTimeInterval(9999)) == 0)
        #expect(s.progress(at: start.addingTimeInterval(9999)) == 1)
    }

    /// Completing credits the planned duration, not however long the app took to
    /// notice — reopening hours later must not invent study time.
    @Test func completionCreditsPlannedDurationRegardlessOfWhenNoticed() {
        let s = session(minutes: 30)
        let noticedLate = start.addingTimeInterval(6 * 3600)
        let finished = s.finished(as: .completed, at: noticedLate)
        #expect(finished.elapsed() == 1800)
    }

    @Test func abandoningCreditsOnlyTimeActuallyWorked() {
        let s = session(minutes: 60)
        let finished = s.finished(as: .abandoned, at: start.addingTimeInterval(900))
        #expect(finished.elapsed() == 900)
    }

    @Test func abandoningWhilePausedExcludesThePause() {
        let pausedAt = start.addingTimeInterval(600)
        let s = session().paused(at: pausedAt)
        let finished = s.finished(as: .abandoned, at: pausedAt.addingTimeInterval(1800))
        #expect(finished.elapsed() == 600)
    }

    /// The Live Activity's countdown is derived entirely from this range, so it has
    /// to move with pauses.
    @Test func timerRangeMovesWithAbsorbedPauses() {
        let pausedAt = start.addingTimeInterval(600)
        let resumed = session().paused(at: pausedAt).resumed(at: pausedAt.addingTimeInterval(300))
        #expect(resumed.timerRange.lowerBound == start.addingTimeInterval(300))
        #expect(resumed.timerRange.upperBound == start.addingTimeInterval(300 + 3600))
    }
}
