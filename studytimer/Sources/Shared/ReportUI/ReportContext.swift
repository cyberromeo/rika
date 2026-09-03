import DeviceActivity
// SwiftUI is required, not incidental: `DeviceActivityReport` is a SwiftUI view
// type and the DeviceActivity module only surfaces it when SwiftUI is in scope.
// Without this import the build fails with "cannot find type
// 'DeviceActivityReport'" in every target that compiles this file.
import SwiftUI

/// Shared between the app (which embeds `DeviceActivityReport`) and the report
/// extension (which registers the scene). Both sides match on this *string*, so
/// defining it once is the difference between a working panel and a blank one.
///
/// Deliberately in its own folder rather than in `ScreenTime/`: only those two
/// targets need it, and the monitor and shield extensions have no business
/// linking a SwiftUI report type they never render.
public extension DeviceActivityReport.Context {
    static let dailyTotal = Self("Daily Total")
}
