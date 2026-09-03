# Lock In

A native iOS study timer that blocks distracting apps for the length of a session,
and keeps a live countdown on the Lock Screen and Dynamic Island.

Spun out of the study timer in the web app one directory up
([`src/pages/StudyPage.tsx`](../src/pages/StudyPage.tsx)) — a browser can't shield
apps or draw on the Lock Screen, and those are the two things that make a focus
timer work. Session history syncs back to the same medx backend, so the streak and
daily totals stay consistent between the two.

## Build

There is no `.xcodeproj` in the repo; it's generated.

```bash
brew install xcodegen
cd studytimer
xcodegen generate
open StudyTimer.xcodeproj
```

Then set your team under Signing & Capabilities for **all six targets** and run on a
physical device.

For medx sync, `cp Config/Secrets.example.xcconfig Config/Secrets.xcconfig` and fill
in the password. `Base.xcconfig` includes it with `#include?`, so skipping this step
isn't a build error — the app just runs offline.

CI builds every push on a `macos-26` runner
([`.github/workflows/ios.yml`](../.github/workflows/ios.yml)) — that's the compile
check for this project, since it's developed from Windows.

## Requirements

| | |
|---|---|
| Xcode | 26 (iOS 26 SDK — Liquid Glass and `LiveActivityIntent` both need it) |
| Device | A real iPhone. Family Controls authorization does not work in the Simulator. |
| Account | **Paid** Apple Developer Program membership. The Family Controls capability doesn't exist for free/personal teams. |
| Distribution | TestFlight and the App Store additionally need the [Family Controls (Distribution)](https://developer.apple.com/contact/request/family-controls-distribution) entitlement, which is a request to Apple that takes days to weeks. Development signing works immediately; request distribution early if you ever want it on TestFlight. |

## Targets

| Target | Role |
|---|---|
| `StudyTimer` | The app |
| `StudyTimerWidgets` | Live Activity — Lock Screen, Dynamic Island, and the intents behind its buttons |
| `StudyTimerMonitor` | `DeviceActivityMonitor` — **lifts the shield even if the app is dead** |
| `StudyTimerShieldConfig` | The "You're locked in" screen shown when a blocked app is opened |
| `StudyTimerShieldAction` | That screen's button handling |
| `StudyTimerReport` | Renders real screen-time usage |

`Sources/Shared/Core` is pure logic (no Screen Time imports, unit-testable);
`Sources/Shared/ScreenTime` wraps the entitled frameworks; `Sources/Shared/Intents`
is shared between the app and the widget because `LiveActivityIntent` is referenced
in one and executed in the other.

## How it holds together

**Time is derived from dates, never counted.** A `Session` stores `startedAt`,
`plannedDuration` and absorbed pause time; everything else is computed. The view
redraws via `TimelineView`, the Live Activity via `Text(timerInterval:)`. Nothing
ticks, so nothing drifts — the countdown survives backgrounding, force-quit and
reboot. One `Task` sleeps until the projected end; that's the only timer in the app.

**The shield can always lift itself.** If the app were the only thing able to clear
a shield, a crash mid-session would lock you out of your own phone. So applying one
also registers a `DeviceActivitySchedule`, and `StudyTimerMonitor.intervalDidEnd`
clears it in a process the app doesn't control. Two more nets: an orphan sweep on
launch, and a foreground check. Settings has a manual **Clear all restrictions** as
the last resort.

**Completed sessions are not logged from the client.** The backend already
auto-completes an expired `activeTimer` and writes the log itself
([`api/studytime.js`](../api/studytime.js), `getOrInitState`), so completion sends
`cancel_timer` alone. Sending `log` too would double-count — which is the bug the web
app has at [`StudyPage.tsx:161`](../src/pages/StudyPage.tsx#L161).

**Screen-time numbers can't leave their extension.** `StudyTimerReport` is sandboxed
with no network and no channel back to the app. Insights therefore has two distinct
zones: *your sessions* (local, chartable, syncable) and *system usage* (an embedded
view the app can place but never read). There's no combined score, because the
framework makes one impossible.

**Glass is for controls only.** Liquid Glass is a navigation-layer material, so it's
on the tab bar, the Start/Pause/End pills and sheets. The timer ring, digits and
charts are content: black background, accent in the content itself — the same rule
already written into [`src/index.css`](../src/index.css).

## Tuning the friction

Ending a session early takes a press-and-hold, and the curve lives in one place:
[`Sources/Shared/Core/LockInPolicy.swift`](Sources/Shared/Core/LockInPolicy.swift).
Both `holdDuration(for:)` and `consequence(for:)` currently hold placeholder
baselines marked with a `TODO` — they're a personal calibration, not an engineering
decision, so they're isolated and documented rather than scattered.

## Verify these four strings on device

Extension point identifiers fail *silently* — a wrong one means the extension never
runs, and for the monitor that means the shield never lifts. They were written from
Apple's documentation and forum reports rather than from Xcode's own templates, so
check each against a freshly-created extension target of the same type before
trusting a long session:

| File | Value |
|---|---|
| `Support/Monitor-Info.plist` | `com.apple.deviceactivity.monitor-extension` |
| `Support/ShieldConfig-Info.plist` | `com.apple.ManagedSettingsUI.shield-configuration-service` |
| `Support/ShieldAction-Info.plist` | `com.apple.ManagedSettings.shield-action-service` |
| `Support/Report-Info.plist` | `com.apple.deviceactivityui.report-extension` |

Each `NSExtensionPrincipalClass` must also match its Swift class name exactly.

## On-device test order

Each step depends on the one before it, so work down the list:

1. Authorization succeeds and prompts for the Screen Time passcode.
2. The picker lists apps, and the selection survives an app restart.
3. Start a 15-minute session, open a blocked app — the custom black shield appears,
   not the system default.
4. **Force-quit the app mid-session and wait past the end time. The shield must lift
   on its own.** The most important test here: if it doesn't, recovery is
   Settings › Screen Time › revoke access.
5. Lock the phone mid-session — the countdown ticks with no app running, and the
   Dynamic Island Pause/End buttons work.
6. Finish a session, then check the web app moved `todayStudySeconds` and the streak
   **once**, not twice.

Steps 1–5 cannot be verified by CI or from a Windows machine at all.

## Getting it on the phone

There is no way to produce an installable build from Windows. The
[`iOS Device Build`](../.github/workflows/ios-device.yml) workflow does it on a
runner instead — manual trigger, uploads a signed `.ipa` as an artifact.

It signs with an **App Store Connect API key** and automatic provisioning rather
than imported certificates. That's not a stylistic preference: six targets would
otherwise mean six provisioning profiles created, base64-ed and kept in sync by
hand. With an API key `xcodebuild` creates and downloads all six itself.

**One-time setup.** All of it is doable from a browser on Windows.

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Users and
   Access → Integrations → App Store Connect API → **+**. Role **App Manager**.
   Download the `.p8` — you get exactly one chance. Note the Key ID and Issuer ID.
2. [developer.apple.com](https://developer.apple.com/account) → Devices → **+**.
   Add your iPhone's UDID. Automatic provisioning can create profiles but cannot
   register a device for you, so a build signed before this step won't install.
3. Identifiers → for each of the six bundle IDs (`quest.srihari.studytimer` and its
   `.widgets`, `.monitor`, `.shieldconfig`, `.shieldaction`, `.report` suffixes) →
   enable **Family Controls**. Xcode can create the App IDs but won't enable an
   entitlement that needs approval. The workflow warns if the signed binary comes
   out without it.
4. Add four repository secrets: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID`, and
   `ASC_KEY_P8` (the `.p8` base64-encoded — `certutil -encode AuthKey_XXX.p8 out.txt`
   on Windows, then strip the header/footer lines).

**Installing the artifact.** The `.ipa` is signed for development, so it installs
directly — no TestFlight. On Windows use [Sideloadly](https://sideloadly.io) or
iMazing; on a Mac, Apple Configurator. TestFlight is a different route entirely and
is blocked until Apple approves the Family Controls (Distribution) entitlement, so
don't plan around it.

## Relationship to `ios/`

There's a separate, larger native port of the whole Rika dashboard in
[`../ios/`](../ios/) (Rika app + widgets). This is a different product — a
single-purpose timer with the Family Controls entitlement that one doesn't have — so
it's a separate project rather than another tab there. Conventions are shared
deliberately: the `Base.xcconfig` + `#include? Secrets.xcconfig` pattern, XcodeGen,
Swift 5 mode, iOS 26 target, and deadline-derived rather than tick-counted time.

Two intentional divergences worth knowing:

- **Breaks are never logged.** The web app maps `break10` → `study` before calling
  `log` ([`StudyPage.tsx:160`](../src/pages/StudyPage.tsx#L160)), so break time
  inflates the study total. Here a break is time off: not logged, not synced, never
  shielded. Daily totals from this app will therefore read slightly lower than the
  web app's for the same day.
- **The 8am IST study day is implemented client-side** ([`StudyDay`](Sources/Shared/Core/StudyDay.swift)).
  `ios/Shared/Models/DayKey.swift` uses local midnight and defers to the server's
  anchor; this app needs its own copy because local history and streaks are computed
  offline.

## Known limits

- **The block is escapable.** iOS Settings › Screen Time can revoke authorization at
  any time. `denyAppRemoval` stops deletion, not revocation. This is friction, not a
  cage, and the UI doesn't pretend otherwise.
- **Sessions under 15 minutes run unshielded.** `DeviceActivitySchedule` has a ~15
  minute minimum, so a shorter session has no OS-level safety valve. Starting one
  shows a banner explaining why rather than silently not blocking.
- **Live Activities expire after ~8 hours**, so a single session longer than that
  loses its Lock Screen presence.
- **Swift 5 language mode**, set in `project.yml` — with CI as the only compiler,
  Swift 6 strict-concurrency diagnostics would cost a push-and-wait cycle each.
  Worth revisiting once there's a Mac in the loop.

