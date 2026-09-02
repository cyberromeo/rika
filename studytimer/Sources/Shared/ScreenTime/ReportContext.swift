import DeviceActivity

/// Shared between the app (which embeds `DeviceActivityReport`) and the report
/// extension (which registers the scene). Both sides match on this *string*, so
/// defining it once is the difference between a working panel and a blank one.
public extension DeviceActivityReport.Context {
    static let dailyTotal = Self("Daily Total")
}
