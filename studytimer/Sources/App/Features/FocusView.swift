import SwiftUI

/// The screen the app exists for.
///
/// Two states in one layout rather than two screens, so starting a session is a
/// transformation of what you were already looking at instead of a navigation. The
/// single glass pill morphs into the Pause/End pair via `glassEffectID` — one
/// deliberate animation, matching the restraint already chosen for the web app's
/// tabbar (`f7-tabbar-animation-scope`): the thing that moves is the thing that
/// changed, and nothing else moves at all.
struct FocusView: View {
    @Environment(SessionEngine.self) private var engine
    @Namespace private var glass

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                Spacer(minLength: 12)
                ring
                Spacer(minLength: 16)
                controls
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
        }
        .sheet(item: outcomeBinding) { outcome in
            SessionOutcomeSheet(outcome: outcome) { engine.dismissOutcome() }
        }
    }

    // MARK: Header

    private var header: some View {
        VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(engine.isActive ? "IN SESSION" : "READY")
                        .font(Theme.eyebrow)
                        .foregroundStyle(engine.isActive ? engine.mode.tint : Theme.tertiaryText)
                    Text(engine.isActive ? engine.mode.title : "Lock In")
                        .font(.system(size: 26, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.primaryText)
                }
                Spacer()
                blockedBadge
            }
            .padding(.top, 6)

            if !engine.isActive {
                ModeSelector(mode: modeBinding, isEnabled: true)
            }

            if let warning = engine.startWarning {
                WarningBanner(text: warning) { engine.dismissWarning() }
            }
        }
    }

    /// Tokens are opaque, so a count is genuinely all that can be shown here —
    /// there's no way to name or preview the blocked apps.
    private var blockedBadge: some View {
        Group {
            if engine.blockedCount > 0 {
                HStack(spacing: 5) {
                    Image(systemName: engine.isActive ? "lock.fill" : "lock.open")
                        .font(.system(size: 10, weight: .bold))
                    Text("\(engine.blockedCount)")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                }
                .foregroundStyle(engine.isActive ? engine.mode.tint : Theme.secondaryText)
                .padding(.horizontal, 11)
                .padding(.vertical, 7)
                .glassEffect(.regular, in: .capsule)
            }
        }
    }

    // MARK: Ring

    private var ring: some View {
        // Ticks once a second purely to redraw; no state is mutated, so there's
        // nothing to drift out of sync with the stored dates.
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let session = engine.session
            let remaining = session?.remaining(at: context.date) ?? TimeInterval(engine.selectedMinutes * 60)
            let progress = session?.progress(at: context.date) ?? 0

            ZStack {
                TimerRing(progress: progress, tint: engine.mode.tint, isActive: engine.isRunning)

                VStack(spacing: 6) {
                    Text(TimeFormatting.clock(remaining))
                        .font(Theme.timerFont(engine.isActive ? 56 : 50))
                        .foregroundStyle(Theme.primaryText)
                        .contentTransition(.numericText(countsDown: true))

                    Text(subtitle(for: session, at: context.date))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.tertiaryText)
                        .textCase(.uppercase)
                        .tracking(0.6)
                }
            }
            .frame(maxWidth: 300)
            .aspectRatio(1, contentMode: .fit)
        }
    }

    private func subtitle(for session: Session?, at now: Date) -> String {
        guard let session else { return "\(engine.selectedMinutes) minute \(engine.mode.title)" }
        if session.state == .paused { return "Paused" }
        return "\(Int(session.plannedDuration / 60))m · ends \(session.projectedEnd.formatted(date: .omitted, time: .shortened))"
    }

    // MARK: Controls

    private var controls: some View {
        VStack(spacing: 16) {
            if !engine.isActive {
                DurationPicker(mode: engine.mode, minutes: minutesBinding, isEnabled: true)
            }

            GlassEffectContainer(spacing: 14) {
                if engine.isActive {
                    HStack(spacing: 12) {
                        Button {
                            engine.isPaused ? engine.resume() : engine.pause()
                        } label: {
                            Label(
                                engine.isPaused ? "Resume" : "Pause",
                                systemImage: engine.isPaused ? "play.fill" : "pause.fill"
                            )
                            .font(.system(size: 15, weight: .semibold))
                            .frame(height: 52)
                            .frame(maxWidth: .infinity)
                            .contentShape(.capsule)
                        }
                        .buttonStyle(.glass)
                        .glassEffectID("primary", in: glass)

                        HoldToEndButton(holdDuration: holdDuration) { engine.endEarly() }
                            .glassEffectID("secondary", in: glass)
                    }
                } else {
                    Button {
                        engine.start()
                    } label: {
                        Label("Start \(engine.mode.title)", systemImage: "play.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .frame(height: 54)
                            .frame(maxWidth: .infinity)
                            .contentShape(.capsule)
                    }
                    .buttonStyle(.glassProminent)
                    .tint(engine.mode.tint)
                    .glassEffectID("primary", in: glass)
                }
            }
            .animation(.smooth(duration: 0.4), value: engine.isActive)
        }
    }

    private var holdDuration: TimeInterval {
        guard let session = engine.session else { return 0 }
        return LockInPolicy.holdDuration(for: session)
    }

    // MARK: Bindings
    //
    // The engine intentionally exposes read-only state plus commands, so the two
    // genuinely two-way values are bridged explicitly rather than by making
    // everything `var`.

    private var modeBinding: Binding<SessionMode> {
        Binding(get: { engine.mode }, set: { engine.mode = $0 })
    }

    private var minutesBinding: Binding<Int> {
        Binding(get: { engine.selectedMinutes }, set: { engine.selectedMinutes = $0 })
    }

    private var outcomeBinding: Binding<SessionEngine.Outcome?> {
        Binding(get: { engine.lastOutcome }, set: { if $0 == nil { engine.dismissOutcome() } })
    }
}
