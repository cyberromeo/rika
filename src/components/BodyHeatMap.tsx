import React from 'react';
import { hapticFeedback } from '../telegram';
import {
  MUSCLE_LABELS,
  recoveryTier,
  MuscleRecovery,
} from '../api/motra';

/**
 * A muscle region on one of the two figures.
 *
 * `pair` regions are authored once for the left half and drawn a second time
 * inside a mirroring <g>, so both sides always shade identically and there is
 * only one copy of each path to maintain. `center` regions straddle the spine
 * and are drawn once.
 */
interface Region {
  muscle: string;
  d: string;
  kind: 'pair' | 'center';
}

/* Figure geometry, in a 120x300 viewBox with the spine at x=60.
   y bands: head 6-38 · shoulders 48 · waist 100 · hips 130 · knees 210 · feet 288 */

const OUTLINE_PAIR = [
  // Arm: shoulder cap down to the hand.
  'M35 48 C28 51 24 58 23 68 C22 80 21 92 20 104 C19 116 17 132 15 148 C15 155 14 160 14 163 C18 166 23 166 26 163 C27 155 28 146 30 134 C31 122 33 110 34 100 C35 88 35 74 36 62 C36 55 36 50 35 48 Z',
  // Leg: hip down to the foot.
  'M33 130 C30 142 29 156 30 172 C31 186 33 198 35 210 C36 222 37 234 38 246 C39 256 40 264 41 272 C40 278 40 284 41 288 C46 290 53 290 56 288 C57 280 57 270 57 260 C57 248 57 236 56 224 C56 212 57 200 58 188 C59 174 59 152 58 132 C50 136 40 135 33 130 Z',
];

const OUTLINE_CENTER = [
  // Neck.
  'M53 34 L53 44 C56 47 64 47 67 44 L67 34 Z',
  // Torso.
  'M52 42 C45 43 39 46 35 50 C32 58 31 66 32 74 C33 84 34 92 33 100 C32 110 32 120 33 130 C40 135 50 137 60 137 C70 137 80 135 87 130 C88 120 88 110 87 100 C86 92 87 84 88 74 C89 66 88 58 85 50 C81 46 75 43 68 42 C65 45 60 46 60 46 C60 46 55 45 52 42 Z',
];

const FRONT_REGIONS: Region[] = [
  { muscle: 'traps', kind: 'pair', d: 'M53 43 C46 44 40 47 36 51 C42 52 48 50 53 47 Z' },
  { muscle: 'shoulders', kind: 'pair', d: 'M36 49 C29 52 24 59 23 69 C27 73 32 73 35 70 C36 63 36 55 36 49 Z' },
  { muscle: 'chest', kind: 'pair', d: 'M58 50 C50 50 42 52 37 56 C36 64 37 72 39 78 C45 82 53 82 58 78 C59 68 59 58 58 50 Z' },
  { muscle: 'biceps', kind: 'pair', d: 'M24 70 C22 80 21 90 21 101 C24 107 29 109 33 106 C34 94 34 82 34 70 C31 66 27 66 24 70 Z' },
  { muscle: 'forearms', kind: 'pair', d: 'M21 108 C19 120 17 133 15 146 C14 153 14 158 14 162 C18 165 23 164 26 161 C27 150 29 136 30 122 C31 116 31 111 31 108 C28 110 24 110 21 108 Z' },
  { muscle: 'abs', kind: 'center', d: 'M51 84 C47 92 46 105 47 117 C51 123 56 126 60 126 C64 126 69 123 73 117 C74 105 73 92 69 84 C64 82 56 82 51 84 Z' },
  { muscle: 'obliques', kind: 'pair', d: 'M49 86 C44 90 41 98 41 108 C42 116 44 122 47 126 C49 120 48 108 49 98 Z' },
  { muscle: 'hipFlexors', kind: 'pair', d: 'M49 128 C45 132 43 138 43 144 C48 146 54 145 58 142 C57 136 54 130 49 128 Z' },
  { muscle: 'abductors', kind: 'pair', d: 'M38 130 C33 134 31 142 31 152 C32 160 34 166 37 170 C39 160 39 148 40 138 Z' },
  { muscle: 'quads', kind: 'pair', d: 'M39 146 C35 154 33 168 34 182 C35 194 38 202 42 208 C49 206 53 200 55 192 C56 178 55 162 53 150 C49 146 44 145 39 146 Z' },
  { muscle: 'adductors', kind: 'pair', d: 'M55 146 C51 152 50 164 51 176 C53 184 56 188 58 190 C59 180 59 164 59 150 Z' },
  { muscle: 'tibialisAnterior', kind: 'pair', d: 'M43 218 C40 226 39 238 40 250 C41 258 43 264 45 268 C48 266 50 260 50 252 C50 240 48 228 46 220 Z' },
];

const BACK_REGIONS: Region[] = [
  { muscle: 'traps', kind: 'center', d: 'M52 42 C44 45 38 49 34 53 C42 58 49 64 54 72 C57 76 59 80 60 84 C61 80 63 76 66 72 C71 64 78 58 86 53 C82 49 76 45 68 42 C65 46 60 47 60 47 C60 47 55 46 52 42 Z' },
  { muscle: 'shoulders', kind: 'pair', d: 'M36 49 C29 52 24 59 23 69 C27 73 32 73 35 70 C36 63 36 55 36 49 Z' },
  { muscle: 'lats', kind: 'pair', d: 'M36 60 C34 72 34 86 37 98 C41 108 48 116 55 122 C58 114 58 102 56 92 C53 78 46 66 38 60 Z' },
  { muscle: 'triceps', kind: 'pair', d: 'M24 70 C22 80 21 90 21 101 C24 107 29 109 33 106 C34 94 34 82 34 70 C31 66 27 66 24 70 Z' },
  { muscle: 'forearms', kind: 'pair', d: 'M21 108 C19 120 17 133 15 146 C14 153 14 158 14 162 C18 165 23 164 26 161 C27 150 29 136 30 122 C31 116 31 111 31 108 C28 110 24 110 21 108 Z' },
  { muscle: 'lowerBack', kind: 'center', d: 'M51 120 C48 126 47 133 48 140 C53 143 67 143 72 140 C73 133 72 126 69 120 C64 123 56 123 51 120 Z' },
  { muscle: 'glutes', kind: 'pair', d: 'M44 140 C38 144 34 152 34 161 C35 169 40 175 47 177 C53 177 57 173 58 167 C59 158 58 148 56 142 C52 140 48 139 44 140 Z' },
  { muscle: 'hamstrings', kind: 'pair', d: 'M39 180 C36 190 35 200 36 210 C38 218 41 224 45 228 C50 226 53 220 54 212 C55 200 54 190 52 182 C48 179 43 178 39 180 Z' },
  { muscle: 'calves', kind: 'pair', d: 'M41 232 C38 240 37 250 38 258 C40 266 43 270 46 272 C50 270 52 264 52 256 C52 246 50 238 48 232 Z' },
];

/** Abs striations + spine — drawn over the fills as detail, never interactive. */
const FRONT_DETAIL = [
  'M60 84 L60 124', 'M49 96 L71 96', 'M48 108 L72 108', 'M50 118 L70 118',
];
const BACK_DETAIL = ['M60 84 L60 140'];

/**
 * Fatigue drives opacity so two muscles in the same colour band still read
 * apart — a 91% shoulder should look calmer than a 72% chest. Fully recovered
 * muscles sit flat and let the CSS `tier-ready` fill dim them out.
 */
function fillOpacityFor(recovery: number): number {
  if (recovery >= 100) return 1;
  const fatigue = 100 - recovery;
  return Math.min(1, 0.3 + (fatigue / 50) * 0.7);
}

interface BodyHeatMapProps {
  muscles: Record<string, MuscleRecovery>;
  onSelectMuscle?: (muscle: string) => void;
  selectedMuscle?: string | null;
}

export default function BodyHeatMap({ muscles, onSelectMuscle, selectedMuscle }: BodyHeatMapProps) {
  const handleSelect = (muscle: string) => {
    hapticFeedback('light');
    onSelectMuscle?.(muscle);
  };

  const renderRegion = (region: Region, index: number, mirrored: boolean) => {
    const data = muscles[region.muscle];
    const recovery = data?.recovery ?? 100;
    const tier = recoveryTier(recovery);
    const label = MUSCLE_LABELS[region.muscle] || region.muscle;
    const days = data?.daysToRecovery ?? 0;
    const tip = days > 0
      ? `${label} — ${recovery}% recovered, ${days} day${days !== 1 ? 's' : ''} to go`
      : `${label} — ${recovery}% recovered`;

    return (
      <path
        key={`${region.muscle}-${index}-${mirrored ? 'r' : 'l'}`}
        className={`bhm-muscle tier-${tier} ${selectedMuscle === region.muscle ? 'selected' : ''}`}
        d={region.d}
        style={{ fillOpacity: fillOpacityFor(recovery) }}
        onClick={() => handleSelect(region.muscle)}
      >
        <title>{tip}</title>
      </path>
    );
  };

  const renderFigure = (regions: Region[], detail: string[], caption: string) => {
    const pairs = regions.filter(r => r.kind === 'pair');
    const centers = regions.filter(r => r.kind === 'center');

    return (
      <div className="bhm-figure">
        <svg viewBox="0 0 120 300" className="bhm-svg" role="img" aria-label={`${caption} muscle recovery`}>
          {/* Silhouette under the fills. */}
          <g className="bhm-outline-group">
            <ellipse className="bhm-outline" cx="60" cy="22" rx="13" ry="16.5" />
            {OUTLINE_CENTER.map((d, i) => <path className="bhm-outline" key={`oc${i}`} d={d} />)}
            {OUTLINE_PAIR.map((d, i) => <path className="bhm-outline" key={`ol${i}`} d={d} />)}
            <g transform="translate(120,0) scale(-1,1)">
              {OUTLINE_PAIR.map((d, i) => <path className="bhm-outline" key={`or${i}`} d={d} />)}
            </g>
          </g>

          {/* Muscle fills — left half authored once, right half mirrored. */}
          {centers.map((r, i) => renderRegion(r, i, false))}
          {pairs.map((r, i) => renderRegion(r, i, false))}
          <g transform="translate(120,0) scale(-1,1)">
            {pairs.map((r, i) => renderRegion(r, i, true))}
          </g>

          <g className="bhm-detail-group">
            {detail.map((d, i) => <path className="bhm-detail" key={`d${i}`} d={d} />)}
          </g>
        </svg>
        <span className="bhm-caption">{caption}</span>
      </div>
    );
  };

  return (
    <div className="bhm-root">
      <div className="bhm-figures">
        {renderFigure(FRONT_REGIONS, FRONT_DETAIL, 'Front')}
        {renderFigure(BACK_REGIONS, BACK_DETAIL, 'Back')}
      </div>

      <div className="bhm-legend">
        <div className="bhm-legend-bar" />
        <div className="bhm-legend-labels">
          <span>FATIGUED</span>
          <span>RECOVERED</span>
        </div>
      </div>
    </div>
  );
}
