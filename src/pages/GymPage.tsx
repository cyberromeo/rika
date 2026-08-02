import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { hapticFeedback } from '../telegram';
import BodyHeatMap from '../components/BodyHeatMap';
import {
  getMotraData,
  subscribeMotraData,
  parseRecoveryPercent,
  recoveryTier,
  normalizeMuscleGroups,
  MUSCLE_LABELS,
  MUSCLE_GROUP_AXES,
  MUSCLE_GROUP_LABELS,
  MotraData,
  RecentWorkout,
  WorkoutExercise,
} from '../api/motra';

type GymSubTab = 'recovery' | 'sessions' | 'stats';
type RadarMetric = 'reps' | 'sets' | 'volume_kg';

const RADAR_METRICS: { id: RadarMetric; label: string }[] = [
  { id: 'reps', label: 'Reps' },
  { id: 'sets', label: 'Sets' },
  { id: 'volume_kg', label: 'Volume' },
];

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

function relativeDay(dateStr: string): string {
  try {
    const diff = differenceInCalendarDays(new Date(), parseISO(dateStr));
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
    return `${Math.floor(diff / 365)}y ago`;
  } catch {
    return dateStr;
  }
}

function safeFormat(dateStr: string, pattern: string): string {
  try {
    return format(parseISO(dateStr), pattern);
  } catch {
    return dateStr;
  }
}

/* ─── Radar chart ─────────────────────────────────────────────────────────── */

interface RadarProps {
  values: number[];
  labels: string[];
  displayValues: string[];
}

function MuscleGroupRadar({ values, labels, displayValues }: RadarProps) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 74;
  const count = values.length;
  const max = Math.max(...values, 1);

  // Start at the top-left spoke (-120°) and go clockwise, so the six axes land
  // as Back / Shoulders / Core / Arms / Chest / Legs around the hexagon.
  const angleAt = (i: number) => (Math.PI * 2 * i) / count - (Math.PI * 2) / 3;

  const pointAt = (i: number, r: number) => {
    const a = angleAt(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  const polygon = values
    .map((v, i) => {
      const r = (v / max) * radius;
      const [x, y] = pointAt(i, r);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const hasData = values.some(v => v > 0);

  return (
    <div className="gym-radar-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="gym-radar" role="img" aria-label="Muscle group distribution">
        {/* Concentric grid rings */}
        {[0.25, 0.5, 0.75, 1].map(frac => (
          <polygon
            key={frac}
            className="gym-radar-ring"
            points={values
              .map((_, i) => {
                const [x, y] = pointAt(i, radius * frac);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ')}
          />
        ))}

        {/* Spokes */}
        {values.map((_, i) => {
          const [x, y] = pointAt(i, radius);
          return <line key={i} className="gym-radar-spoke" x1={cx} y1={cy} x2={x} y2={y} />;
        })}

        {/* Data polygon */}
        {hasData && <polygon className="gym-radar-area" points={polygon} />}
        {hasData &&
          values.map((v, i) => {
            if (v <= 0) return null;
            const [x, y] = pointAt(i, (v / max) * radius);
            return <circle key={i} className="gym-radar-dot" cx={x} cy={y} r="2.5" />;
          })}

        {/* Axis labels + values */}
        {labels.map((label, i) => {
          const [lx, ly] = pointAt(i, radius + 26);
          return (
            <g key={label}>
              <text className="gym-radar-label" x={lx} y={ly - 3} textAnchor="middle">
                {label}
              </text>
              <text className="gym-radar-value" x={lx} y={ly + 11} textAnchor="middle">
                {displayValues[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Session row ─────────────────────────────────────────────────────────── */

function SessionRow({ workout }: { workout: RecentWorkout }) {
  const [expanded, setExpanded] = useState(false);
  const hasPrs = workout.pr_count > 0 && workout.personal_records?.length > 0;
  const exercises = workout.exercises || [];
  const canExpand = hasPrs || exercises.length > 0;

  const toggle = () => {
    if (!canExpand) return;
    hapticFeedback('light');
    setExpanded(v => !v);
  };

  return (
    <div className={`gym-session ${canExpand ? 'has-prs' : ''} ${expanded ? 'expanded' : ''}`}>
      <div
        className="gym-session-main"
        onClick={toggle}
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        aria-expanded={canExpand ? expanded : undefined}
        onKeyDown={e => {
          if (canExpand && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className="gym-session-head">
          <span className="gym-session-name">{workout.name}</span>
          {workout.pr_count > 0 && (
            <span className="gym-session-pr-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 9 14 9 21" />
                <path d="M12 3v6" />
                <path d="M20 8l-4 4-4-4" />
              </svg>
              {workout.pr_count} PR{workout.pr_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="gym-session-meta">
          <span className="gym-session-date">{safeFormat(workout.date, 'EEE, d MMM yyyy')}</span>
          <span className="gym-session-rel">{relativeDay(workout.date)}</span>
        </div>

        <div className="gym-session-stats">
          <span>{workout.duration}</span>
          <span className="gym-dot-sep">·</span>
          <span>{formatNumber(workout.calories)} kcal</span>
          {workout.volume_kg > 0 && (
            <>
              <span className="gym-dot-sep">·</span>
              <span>{formatVolume(workout.volume_kg)}</span>
            </>
          )}
          {workout.sets > 0 && (
            <>
              <span className="gym-dot-sep">·</span>
              <span>{workout.sets} sets</span>
            </>
          )}
          {exercises.length > 0 && (
            <>
              <span className="gym-dot-sep">·</span>
              <span>{exercises.length} exercise{exercises.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>

        <div className="gym-chip-row">
          {workout.primary_muscles?.map(m => (
            <span key={`p-${m}`} className="gym-chip primary">{MUSCLE_LABELS[m] || m}</span>
          ))}
          {workout.secondary_muscles?.map(m => (
            <span key={`s-${m}`} className="gym-chip secondary">{MUSCLE_LABELS[m] || m}</span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="gym-session-detail">
          {hasPrs && (
            <div className="gym-pr-list">
              {workout.personal_records.map((pr, i) => (
                <div key={`${pr.exercise}-${i}`} className="gym-pr-item">
                  <span className="gym-pr-name">{pr.exercise}</span>
                  <span className="gym-pr-val">
                    {pr.weight_kg ? `${pr.weight_kg} kg` : pr.reps ? `${pr.reps} reps` : pr.type}
                  </span>
                </div>
              ))}
            </div>
          )}

          {exercises.length > 0 && (
            <div className="gym-ex-list">
              {exercises.map((ex, i) => (
                <ExerciseRow key={`${ex.exercise_id}-${i}`} exercise={ex} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Exercise row ────────────────────────────────────────────────────────── */

function ExerciseRow({ exercise }: { exercise: WorkoutExercise }) {
  const [open, setOpen] = useState(false);
  const sets = exercise.sets || [];
  const hasSets = sets.length > 0;

  const toggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Don't let the tap bubble up and collapse the whole session row.
    e.stopPropagation();
    if (!hasSets) return;
    hapticFeedback('light');
    setOpen(v => !v);
  };

  return (
    <div className={`gym-ex ${open ? 'open' : ''}`}>
      <div
        className="gym-ex-head"
        onClick={toggle}
        role={hasSets ? 'button' : undefined}
        tabIndex={hasSets ? 0 : undefined}
        aria-expanded={hasSets ? open : undefined}
        onKeyDown={e => {
          if (hasSets && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggle(e);
          }
        }}
      >
        <div className="gym-ex-title">
          <span className="gym-ex-name">{exercise.exercise}</span>
          <span className="gym-ex-sub">
            {exercise.set_count} set{exercise.set_count !== 1 ? 's' : ''}
            {exercise.total_reps > 0 && ` · ${exercise.total_reps} reps`}
            {exercise.top_weight_kg ? ` · top ${exercise.top_weight_kg} kg` : ''}
          </span>
        </div>
        {exercise.volume_kg > 0 && (
          <span className="gym-ex-vol">{formatVolume(exercise.volume_kg)}</span>
        )}
      </div>

      {!open && exercise.summary && (
        <div className="gym-ex-summary">{exercise.summary}</div>
      )}

      {open && hasSets && (
        <div className="gym-set-table">
          {sets.map((s, i) => (
            <div key={i} className={`gym-set-row ${s.phase === 'warmup' ? 'warmup' : ''}`}>
              <span className="gym-set-idx">
                {s.phase === 'warmup' ? 'W' : s.set}
              </span>
              <span className="gym-set-reps">
                {s.reps != null ? `${s.reps} reps` : '—'}
              </span>
              <span className="gym-set-weight">
                {s.weight_kg != null ? `${s.weight_kg} ${s.unit || 'kg'}` : '—'}
              </span>
              <span className="gym-set-rest">
                {s.rest_seconds != null ? `${Math.round(s.rest_seconds)}s rest` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function GymPage() {
  const [activeTab, setActiveTab] = useState<GymSubTab>('recovery');
  const [data, setData] = useState<MotraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [radarMetric, setRadarMetric] = useState<RadarMetric>('reps');

  useEffect(() => {
    getMotraData().then(d => { setData(d); setLoading(false); });
    const unsubscribe = subscribeMotraData(d => {
      setData(d);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubTabChange = (next: GymSubTab) => {
    if (next === activeTab) return;
    hapticFeedback('light');
    setActiveTab(next);
  };

  const recovery = data ? parseRecoveryPercent(data.overall_recovery) : 0;

  const groups = useMemo(
    () => normalizeMuscleGroups(data?.muscle_groups || []),
    [data?.muscle_groups],
  );

  const radar = useMemo(() => {
    const values = MUSCLE_GROUP_AXES.map(axis => groups[axis][radarMetric]);
    const display = MUSCLE_GROUP_AXES.map(axis => {
      const v = groups[axis][radarMetric];
      return radarMetric === 'volume_kg' ? (v > 0 ? formatVolume(v) : '0') : formatNumber(v);
    });
    return {
      values,
      labels: MUSCLE_GROUP_AXES.map(a => MUSCLE_GROUP_LABELS[a]),
      display,
    };
  }, [groups, radarMetric]);

  const selected = selectedMuscle && data ? data.muscles[selectedMuscle] : null;

  const weekMaxMinutes = useMemo(() => {
    const days = data?.weekly?.days || [];
    return Math.max(...days.map(d => d.minutes), 1);
  }, [data?.weekly?.days]);

  if (loading) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1>Gym</h1>
          <div className="subtitle">Loading recovery from Motra…</div>
        </div>
        <div className="study-loading">
          <div className="loading-spinner" />
          <span>Fetching workout data…</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const subtitle = data.last_workout
    ? `Last session ${relativeDay(data.last_workout.date).toLowerCase()} · ${data.lifetime.workouts} lifetime`
    : `${data.lifetime.workouts} lifetime workouts`;

  return (
    <div className="page-enter gym-page">
      <div className="page-header">
        <h1>Gym</h1>
        <div className="subtitle">{subtitle}</div>
      </div>

      <div className="study-segmented-nav">
        <button
          className={`study-nav-btn ${activeTab === 'recovery' ? 'active' : ''}`}
          onClick={() => handleSubTabChange('recovery')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Recovery
        </button>
        <button
          className={`study-nav-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => handleSubTabChange('sessions')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11v11h-11z" />
            <path d="M3 9v6M21 9v6M6.5 12h11" />
          </svg>
          Sessions
        </button>
        <button
          className={`study-nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => handleSubTabChange('stats')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Stats
        </button>
      </div>

      {/* RECOVERY TAB */}
      {activeTab === 'recovery' && (
        <div className="gym-content">
          {/* Overall recovery summary */}
          <div className="study-card gym-summary-card">
            <div className="gym-summary-ring-wrap">
              <div className="stat-card-ring gym-big-ring">
                <svg viewBox="0 0 36 36" className="stat-ring-svg">
                  <circle className="ring-bg" cx="18" cy="18" r="15.5" />
                  <circle
                    className="ring-fill gym-ring-fill"
                    cx="18" cy="18" r="15.5"
                    strokeDasharray={`${(recovery / 100) * 97.4} 97.4`}
                  />
                </svg>
                <div className="ring-center">
                  <span className="ring-pct">{recovery}%</span>
                </div>
              </div>
              <div className="gym-summary-info">
                <div className="gym-summary-title">Overall Recovery</div>
                <div className="gym-summary-value">{data.recovered_muscles} muscles ready</div>
                <div className="gym-summary-sub">
                  {data.recovering_muscles > 0
                    ? `${data.recovering_muscles} still recovering`
                    : 'Everything is fresh'}
                </div>
              </div>
            </div>

            <div className="gym-summary-foot">
              <span>
                {data.days_since_workout === 0
                  ? 'Trained today'
                  : `${data.days_since_workout} day${data.days_since_workout !== 1 ? 's' : ''} since last workout`}
              </span>
              {data.updated_at && <span className="gym-updated">Synced {data.updated_at}</span>}
            </div>
          </div>

          {/* Body heat map */}
          <div className="study-card gym-map-card">
            <div className="card-title-row">
              <h3 className="card-title-with-icon gym-map-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="4.5" r="2.5" />
                  <path d="M12 7v6M12 13l-3 8M12 13l3 8M6 9l6-1.5L18 9" />
                </svg>
                Muscle Recovery
              </h3>
              <span className="card-sub-tag">Tap a muscle</span>
            </div>

            <BodyHeatMap
              muscles={data.muscles}
              onSelectMuscle={m => setSelectedMuscle(prev => (prev === m ? null : m))}
              selectedMuscle={selectedMuscle}
            />

            {selectedMuscle && selected && (
              <div className={`gym-selected-detail tier-${recoveryTier(selected.recovery)}`}>
                <div className="gym-selected-left">
                  <span className="gym-selected-name">
                    {MUSCLE_LABELS[selectedMuscle] || selectedMuscle}
                  </span>
                  <span className="gym-selected-sub">
                    {selected.daysSinceLastUsed === null
                      ? 'Not trained recently'
                      : `Last trained ${selected.daysSinceLastUsed} day${selected.daysSinceLastUsed !== 1 ? 's' : ''} ago`}
                  </span>
                </div>
                <div className="gym-selected-right">
                  <span className="gym-selected-pct">{selected.recovery}%</span>
                  <span className="gym-selected-days">
                    {selected.daysToRecovery > 0
                      ? `${selected.daysToRecovery}d to go`
                      : 'Ready'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Still recovering list */}
          <div className="study-card">
            <div className="card-title-row">
              <h3 className="card-title-with-icon gym-recovering-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Still Recovering
              </h3>
              <span className="card-sub-tag">{data.muscles_needing_recovery.length} muscles</span>
            </div>

            {data.muscles_needing_recovery.length === 0 ? (
              <div className="gym-empty">All muscles fully recovered. Go lift.</div>
            ) : (
              <div className="gym-recovering-list">
                {data.muscles_needing_recovery.map(m => (
                  <div key={m.muscle} className={`gym-recovering-row tier-${recoveryTier(m.recovery)}`}>
                    <span className="gym-recovering-name">{MUSCLE_LABELS[m.muscle] || m.muscle}</span>
                    <div className="gym-recovering-bar-bg">
                      <div className="gym-recovering-bar-fill" style={{ width: `${m.recovery}%` }} />
                    </div>
                    <span className="gym-recovering-pct">{m.recovery}%</span>
                    <span className="gym-recovering-days">
                      {m.days_to_recovery > 0 ? `${m.days_to_recovery}d` : 'today'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <div className="gym-content">
          {/* This week */}
          <div className="study-card">
            <div className="card-title-row">
              <h3 className="card-title-with-icon gym-week-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                This Week
              </h3>
              <span className="gym-week-total">{data.weekly.total_duration}</span>
            </div>

            <div className="gym-week-stats">
              <div className="gym-week-stat">
                <span className="gym-week-num">{data.weekly.days_trained}</span>
                <span className="gym-week-lbl">Days</span>
              </div>
              <div className="gym-week-div" />
              <div className="gym-week-stat">
                <span className="gym-week-num">{data.weekly.total_workouts}</span>
                <span className="gym-week-lbl">Sessions</span>
              </div>
              <div className="gym-week-div" />
              <div className="gym-week-stat">
                <span className="gym-week-num">{formatNumber(data.weekly.total_sets)}</span>
                <span className="gym-week-lbl">Sets</span>
              </div>
              <div className="gym-week-div" />
              <div className="gym-week-stat">
                <span className="gym-week-num">{formatVolume(data.weekly.total_volume_kg)}</span>
                <span className="gym-week-lbl">Volume</span>
              </div>
            </div>

            <div className="weekly-bar-chart gym-week-chart">
              {data.weekly.days.map(day => {
                const pct = day.minutes > 0
                  ? Math.max(6, Math.round((day.minutes / weekMaxMinutes) * 100))
                  : 0;
                return (
                  <div key={day.date} className="bar-column">
                    <div className="bar-values">
                      <span className="val-text">{day.minutes > 0 ? `${day.minutes}m` : ''}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className={`bar-fill gym-bar ${day.trained ? 'trained' : ''}`}
                        style={{ height: `${pct}%` }}
                        title={day.trained
                          ? `${day.weekday}: ${day.minutes}m · ${day.sets} sets · ${formatNumber(day.reps)} reps`
                          : `${day.weekday}: rest day`}
                      />
                    </div>
                    <span className={`day-name ${day.trained ? 'trained' : ''}`}>{day.weekday}</span>
                  </div>
                );
              })}
            </div>

            <div className="gym-week-foot">
              <span>{formatNumber(data.weekly.total_reps)} reps</span>
              <span className="gym-dot-sep">·</span>
              <span>{formatNumber(data.weekly.total_calories)} kcal</span>
              {data.weekly.week_start && (
                <>
                  <span className="gym-dot-sep">·</span>
                  <span>week of {safeFormat(data.weekly.week_start, 'd MMM')}</span>
                </>
              )}
            </div>
          </div>

          {/* Recent sessions */}
          <div className="gym-sessions-header">
            <h3 className="subjects-title-with-icon gym-sessions-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
              Recent Sessions
            </h3>
            <span className="subjects-sub">{data.recent_workouts.length} logged</span>
          </div>

          {data.recent_workouts.length === 0 ? (
            <div className="study-card gym-empty">No sessions logged yet.</div>
          ) : (
            <div className="gym-sessions-list">
              {data.recent_workouts.map(w => (
                <SessionRow key={w.id} workout={w} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && (
        <div className="gym-content">
          {/* Muscle group radar */}
          <div className="study-card gym-radar-card">
            <div className="card-title-row">
              <h3 className="gym-radar-heading">Muscle Groups</h3>
              <span className="gym-period-tag">Last 7 Days</span>
            </div>

            <div className="gym-metric-toggle">
              {RADAR_METRICS.map(m => (
                <button
                  key={m.id}
                  className={`gym-metric-btn ${radarMetric === m.id ? 'active' : ''}`}
                  onClick={() => {
                    if (radarMetric === m.id) return;
                    hapticFeedback('light');
                    setRadarMetric(m.id);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <MuscleGroupRadar
              values={radar.values}
              labels={radar.labels}
              displayValues={radar.display}
            />
          </div>

          {/* Period totals */}
          <div className="study-card">
            <div className="card-title-row">
              <h3 className="card-title-with-icon gym-totals-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 6.5h11v11h-11z" />
                  <path d="M3 9v6M21 9v6" />
                </svg>
                7-Day Totals
              </h3>
            </div>
            <div className="gym-totals-grid">
              <div className="gym-total-tile">
                <span className="gym-total-num">{data.overall.period_workouts}</span>
                <span className="gym-total-lbl">Workouts</span>
              </div>
              <div className="gym-total-tile">
                <span className="gym-total-num">{formatNumber(data.overall.period_reps)}</span>
                <span className="gym-total-lbl">Reps</span>
              </div>
              <div className="gym-total-tile">
                <span className="gym-total-num">{formatNumber(data.overall.period_sets)}</span>
                <span className="gym-total-lbl">Sets</span>
              </div>
              <div className="gym-total-tile">
                <span className="gym-total-num">{formatVolume(data.overall.period_volume_kg)}</span>
                <span className="gym-total-lbl">Volume</span>
              </div>
              <div className="gym-total-tile">
                <span className="gym-total-num">{formatNumber(data.overall.period_calories)}</span>
                <span className="gym-total-lbl">Calories</span>
              </div>
              <div className="gym-total-tile">
                <span className="gym-total-num">{data.overall.period_minutes}</span>
                <span className="gym-total-lbl">Minutes</span>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          {data.overall.leaderboard_rank > 0 && (
            <div className="study-card gym-rank-card">
              <div className="card-title-row">
                <h3 className="card-title-with-icon gym-rank-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5" />
                  </svg>
                  Leaderboard
                </h3>
              </div>
              <div className="gym-rank-body">
                <div className="gym-rank-main">
                  <span className="gym-rank-hash">#</span>
                  <span className="gym-rank-num">{formatNumber(data.overall.leaderboard_rank)}</span>
                </div>
                {data.overall.leaderboard_delta !== 0 && (
                  <div className={`gym-rank-delta ${data.overall.leaderboard_delta > 0 ? 'up' : 'down'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {data.overall.leaderboard_delta > 0
                        ? <polyline points="18 15 12 9 6 15" />
                        : <polyline points="6 9 12 15 18 9" />}
                    </svg>
                    <span>
                      {formatNumber(Math.abs(data.overall.leaderboard_delta))} places
                      {data.overall.leaderboard_delta > 0 ? ' gained' : ' lost'}
                    </span>
                  </div>
                )}
              </div>
              {data.overall.leaderboard_prev_rank > 0 && (
                <div className="gym-rank-prev">
                  was #{formatNumber(data.overall.leaderboard_prev_rank)}
                </div>
              )}
            </div>
          )}

          {/* Lifetime + streak */}
          <div className="study-card">
            <div className="card-title-row">
              <h3 className="card-title-with-icon gym-lifetime-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
                Lifetime & Streak
              </h3>
              <span className="gym-week-total">{data.lifetime.workouts} workouts</span>
            </div>

            <div className="gym-week-stats">
              <div className="gym-week-stat">
                <span className="gym-week-num">{data.streak.current_days}</span>
                <span className="gym-week-lbl">Streak</span>
              </div>
              <div className="gym-week-div" />
              <div className="gym-week-stat">
                <span className="gym-week-num">{data.lifetime.train_workouts}</span>
                <span className="gym-week-lbl">In-App</span>
              </div>
              <div className="gym-week-div" />
              <div className="gym-week-stat">
                <span className="gym-week-num">{data.lifetime.external_workouts}</span>
                <span className="gym-week-lbl">External</span>
              </div>
            </div>

            <div className="gym-goal-row">
              <div className="gym-goal-head">
                <span>Weekly minutes</span>
                <span className="gym-goal-val">
                  {data.streak.minutes} / {data.streak.minutes_goal}m
                </span>
              </div>
              <div className="summary-bar-bg">
                <div
                  className="summary-bar-fill gym-goal-fill"
                  style={{
                    width: `${Math.min(100, data.streak.minutes_goal > 0
                      ? (data.streak.minutes / data.streak.minutes_goal) * 100
                      : 0)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Top exercises */}
          {data.overall.top_exercises.length > 0 && (
            <div className="study-card">
              <div className="card-title-row">
                <h3 className="card-title-with-icon gym-top-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.1 8.6 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.6 12 2" />
                  </svg>
                  Top Exercises
                </h3>
                <span className="card-sub-tag">{data.overall.top_exercises.length}</span>
              </div>
              <div className="gym-top-list">
                {data.overall.top_exercises.map((ex, i) => (
                  <div key={ex} className="gym-top-row">
                    <span className="gym-top-rank">{i + 1}</span>
                    <span className="gym-top-name">{ex}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
