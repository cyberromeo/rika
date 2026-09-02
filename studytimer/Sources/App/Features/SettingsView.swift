import FamilyControls
import SwiftUI

/// Settings, plus the emergency exit.
///
/// "Clear all restrictions" is the important control on this screen. Everything
/// else is preference; that one is the answer to "the app has locked me out and I
/// don't know why". It's deliberately not buried, and deliberately not guarded by
/// friction — friction belongs on quitting a session you're in, not on recovering
/// from a bug.
struct SettingsView: View {
    @Environment(AuthorizationService.self) private var auth
    @Environment(SyncCoordinator.self) private var sync
    @Environment(SessionEngine.self) private var engine

    @State private var notificationsEnabled = NotificationScheduler().isEnabled
    @State private var didClearRestrictions = false

    var body: some View {
        NavigationStack {
            List {
                screenTimeSection
                alertsSection
                syncSection
                recoverySection
                aboutSection
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Settings")
        }
    }

    private var screenTimeSection: some View {
        Section {
            LabeledContent("Status") {
                Text(statusText)
                    .foregroundStyle(auth.isAuthorized ? Theme.green : Theme.amber)
            }
            if auth.isAuthorized {
                Button("Revoke Screen Time access", role: .destructive) {
                    auth.revoke()
                }
                .disabled(engine.isActive)
            } else {
                Button("Grant Screen Time access") {
                    Task { await auth.request() }
                }
            }
        } header: {
            Text("Screen Time")
        } footer: {
            Text(auth.isAuthorized
                 ? "Revoking also clears any active block. Not available mid-session."
                 : "Without this, sessions still run — they just can't block anything.")
        }
    }

    private var alertsSection: some View {
        Section {
            Toggle("Notify when a session ends", isOn: $notificationsEnabled)
                .onChange(of: notificationsEnabled) { _, new in
                    let scheduler = NotificationScheduler()
                    scheduler.isEnabled = new
                    if new {
                        Task { await scheduler.requestPermission() }
                    } else {
                        scheduler.cancelCompletion()
                    }
                }
        } header: {
            Text("Alerts")
        } footer: {
            // Worth saying out loud: the backend fires its own ntfy siren on
            // completion, so leaving both on means two alerts for one session.
            Text("The medx backend also sends its own alert when a synced session ends, so you may hear both.")
        }
    }

    private var syncSection: some View {
        Section {
            LabeledContent("medx sync") {
                Text(sync.isConfigured ? "On" : "Not configured")
                    .foregroundStyle(sync.isConfigured ? Theme.green : Theme.tertiaryText)
            }
            if sync.pendingCount > 0 {
                LabeledContent("Waiting to send") { Text("\(sync.pendingCount)") }
            }
            if let error = sync.lastError {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.amber)
            }
            if let remote = sync.remote {
                LabeledContent("Server streak") { Text("\(remote.streak) days") }
            }
            Button("Sync now") {
                Task {
                    await sync.flush()
                    await sync.refreshRemoteState()
                }
            }
            .disabled(!sync.isConfigured || sync.isFlushing)
        } header: {
            Text("Sync")
        } footer: {
            Text(sync.isConfigured
                 ? "Sessions are stored on this device first and mirrored to medx in the background."
                 : "Add MEDX_BASE_URL and MEDX_PASSWORD to studytimer/Config/Secrets.xcconfig to enable syncing.")
        }
    }

    private var recoverySection: some View {
        Section {
            Button(role: .destructive) {
                ShieldController.clear()
                didClearRestrictions = true
            } label: {
                Label("Clear all restrictions now", systemImage: "lock.open.fill")
            }
            if didClearRestrictions {
                Text("Cleared. Blocked apps should open again immediately.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.green)
            }
        } header: {
            Text("Recovery")
        } footer: {
            Text("Use this if apps are still blocked after a session ended. It won't stop a running session — it only lifts the block.")
        }
    }

    private var aboutSection: some View {
        Section {
            LabeledContent("Study day starts") { Text("8:00 AM IST") }
            LabeledContent("Grace period") {
                Text("\(Int(LockInPolicy.graceWindow / 60)) min")
            }
            LabeledContent("Bails today") { Text("\(LockInPolicy.bailsToday())") }
        } header: {
            Text("Rules")
        } footer: {
            Text("Ending a session inside the grace period is free. After that it takes a hold, and the streak resets.")
        }
    }

    private var statusText: String {
        switch auth.status {
        case .approved: "Authorized"
        case .denied: "Denied"
        case .notDetermined: "Not set up"
        @unknown default: "Unknown"
        }
    }
}
