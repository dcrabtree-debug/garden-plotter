/**
 * Garden Snapshot — Guided capture flow, timeline, and comparison.
 *
 * SnapshotCaptureFlow: stepper walks through towers → tiers, camera per tier.
 * SnapshotTimeline: chronological journal with growth stage change badges.
 * SnapshotCompare: side-by-side tier photos + pocket diffs.
 * SnapshotDashboardWidget: compact card for DashboardPage.
 */

import { useReducer, useRef, useCallback, useMemo } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import { usePhotoStore } from '../state/photo-store';
import {
  useSnapshotStore,
  createSnapshotSession,
  computeSnapshotDiff,
  type SnapshotSession,
  type PocketDiff,
} from '../state/snapshot-store';
import { type GrowthStage } from '../lib/kid-engagement';

// ── Growth stage config ──────────────────────────────────────────────────────

const STAGE_EMOJI: Record<GrowthStage, string> = {
  seed: '🌰', sprout: '🌱', growing: '🌿', flowering: '🌸', fruiting: '🍅', ready: '🎉',
};

const STAGE_NAME: Record<GrowthStage, string> = {
  seed: 'Seed', sprout: 'Sprout', growing: 'Growing', flowering: 'Flowering', fruiting: 'Fruiting', ready: 'Ready',
};

// ── Capture flow state ───────────────────────────────────────────────────────

interface CaptureState {
  step: 'intro' | 'capture-tier' | 'capture-overview' | 'review' | 'done';
  towerIndex: number;
  tierIndex: number;            // 0-based into tower.tiers array
  photos: Map<string, string>;  // "towerId-tier-N" → photoId
  overviews: Map<string, string>; // "towerId" → photoId
}

type CaptureAction =
  | { type: 'START' }
  | { type: 'CAPTURED_TIER'; key: string; photoId: string }
  | { type: 'SKIP_TIER' }
  | { type: 'NEXT_TIER' }
  | { type: 'CAPTURED_OVERVIEW'; key: string; photoId: string }
  | { type: 'SKIP_OVERVIEW' }
  | { type: 'NEXT_TOWER'; totalTowers: number }
  | { type: 'REVIEW' }
  | { type: 'DONE' };

function captureReducer(state: CaptureState, action: CaptureAction): CaptureState {
  switch (action.type) {
    case 'START':
      return { ...state, step: 'capture-tier', towerIndex: 0, tierIndex: 0 };
    case 'CAPTURED_TIER':
      return { ...state, photos: new Map(state.photos).set(action.key, action.photoId) };
    case 'SKIP_TIER':
    case 'NEXT_TIER':
      if (state.tierIndex < 4) {
        return { ...state, tierIndex: state.tierIndex + 1 };
      }
      return { ...state, step: 'capture-overview' };
    case 'CAPTURED_OVERVIEW':
      return { ...state, overviews: new Map(state.overviews).set(action.key, action.photoId) };
    case 'SKIP_OVERVIEW':
      return { ...state, step: 'capture-overview' };
    case 'NEXT_TOWER': {
      if (state.towerIndex < action.totalTowers - 1) {
        return { ...state, towerIndex: state.towerIndex + 1, tierIndex: 0, step: 'capture-tier' };
      }
      return { ...state, step: 'review' };
    }
    case 'REVIEW':
      return { ...state, step: 'review' };
    case 'DONE':
      return { ...state, step: 'done' };
    default:
      return state;
  }
}

const initialCaptureState: CaptureState = {
  step: 'intro',
  towerIndex: 0,
  tierIndex: 0,
  photos: new Map(),
  overviews: new Map(),
};

// ── Tier labels ──────────────────────────────────────────────────────────────

const TIER_LABELS = ['Top', 'Upper', 'Middle', 'Lower', 'Bottom'];

// ══════════════════════════════════════════════════════════════════════════════
// CAPTURE FLOW
// ══════════════════════════════════════════════════════════════════════════════

export function SnapshotCaptureFlow({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
  const towers = usePlannerStore((s) => s.towers);
  const region = useRegion();
  const { plantMap } = usePlantDb(region);
  const { addPhoto } = usePhotoStore();
  const { addSnapshot } = useSnapshotStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, dispatch] = useReducer(captureReducer, initialCaptureState);

  const currentTower = towers[state.towerIndex];
  const currentTierLabel = TIER_LABELS[state.tierIndex] ?? `Tier ${state.tierIndex + 1}`;

  const handleFileCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (state.step === 'capture-tier') {
      const key = `${currentTower.id}-tier-${state.tierIndex + 1}`;
      const photoId = await addPhoto(file, null, 'greenstalk');
      dispatch({ type: 'CAPTURED_TIER', key, photoId });
      // Auto-advance after brief pause
      setTimeout(() => dispatch({ type: 'NEXT_TIER' }), 400);
    } else if (state.step === 'capture-overview') {
      const key = currentTower.id;
      const photoId = await addPhoto(file, null, 'greenstalk');
      dispatch({ type: 'CAPTURED_OVERVIEW', key, photoId });
      setTimeout(() => dispatch({ type: 'NEXT_TOWER', totalTowers: towers.length }), 400);
    }

    // Reset file input for next capture
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [state, currentTower, addPhoto, towers.length]);

  const handleSave = useCallback(() => {
    // Create snapshot session with current garden state
    const session = createSnapshotSession(towers, plantMap);

    // Attach photo IDs to the correct tiers
    for (const tower of session.towers) {
      for (const tier of tower.tiers) {
        const key = `${tower.towerId}-tier-${tier.tierNumber}`;
        tier.photoId = state.photos.get(key) ?? null;
      }
      tower.overviewPhotoId = state.overviews.get(tower.towerId) ?? null;
    }

    addSnapshot(session);
    dispatch({ type: 'DONE' });
    onComplete();
  }, [towers, plantMap, state.photos, state.overviews, addSnapshot, onComplete]);

  // Count how many photos were taken
  const photoCount = state.photos.size + state.overviews.size;

  // Hidden file input
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={handleFileCapture}
    />
  );

  // ── Intro ──────────────────────────────────────────────────────────────────

  if (state.step === 'intro') {
    return (
      <div className="p-6 text-center space-y-4">
        {fileInput}
        <div className="text-4xl">📸</div>
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Weekly Garden Snapshot</h2>
        <p className="text-sm text-stone-500 max-w-xs mx-auto">
          Quick photo of each tier. The app captures growth stages and weather automatically.
        </p>
        <div className="text-xs text-stone-400 space-y-1">
          <div>{towers.length} tower{towers.length > 1 ? 's' : ''} · 5 tiers each · ~{towers.length * 5} photos</div>
          <div>Skip any tier you want. Overview shot optional.</div>
        </div>
        <button
          onClick={() => dispatch({ type: 'START' })}
          className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
        >
          Start Snapshot
        </button>
        <button onClick={onCancel} className="block mx-auto text-xs text-stone-400 mt-2 hover:text-stone-600">
          Cancel
        </button>
      </div>
    );
  }

  // ── Capture Tier ───────────────────────────────────────────────────────────

  if (state.step === 'capture-tier') {
    const tierKey = `${currentTower.id}-tier-${state.tierIndex + 1}`;
    const captured = state.photos.has(tierKey);
    const tierPockets = currentTower.tiers[state.tierIndex]?.pockets ?? [];
    const plantedCount = tierPockets.filter(p => p.plantSlug).length;

    return (
      <div className="p-6 text-center space-y-4">
        {fileInput}
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>{currentTower.name}</span>
          <span>Tier {state.tierIndex + 1} of 5</span>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {TIER_LABELS.map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i < state.tierIndex ? 'bg-emerald-500' :
              i === state.tierIndex ? 'bg-emerald-600 ring-2 ring-emerald-300' :
              'bg-stone-200 dark:bg-stone-600'
            }`} />
          ))}
        </div>

        <div className="text-3xl">
          {captured ? '✅' : '📷'}
        </div>
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
          {currentTierLabel} Tier
        </h2>
        <p className="text-xs text-stone-400">
          {plantedCount > 0 ? `${plantedCount} plant${plantedCount > 1 ? 's' : ''} in this tier` : 'Empty tier'}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
          >
            {captured ? '📷 Retake' : '📷 Take Photo'}
          </button>
          <button
            onClick={() => dispatch({ type: 'SKIP_TIER' })}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            Skip this tier →
          </button>
        </div>
      </div>
    );
  }

  // ── Overview Shot ──────────────────────────────────────────────────────────

  if (state.step === 'capture-overview') {
    const captured = state.overviews.has(currentTower.id);
    return (
      <div className="p-6 text-center space-y-4">
        {fileInput}
        <div className="text-3xl">{captured ? '✅' : '🗼'}</div>
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
          {currentTower.name} — Full Tower Shot
        </h2>
        <p className="text-xs text-stone-400">Optional overview photo of the whole tower</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
          >
            {captured ? '📷 Retake' : '📷 Take Photo'}
          </button>
          <button
            onClick={() => dispatch({ type: 'NEXT_TOWER', totalTowers: towers.length })}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            {state.towerIndex < towers.length - 1 ? `Skip → Next Tower` : 'Skip → Review'}
          </button>
        </div>
      </div>
    );
  }

  // ── Review ─────────────────────────────────────────────────────────────────

  if (state.step === 'review') {
    return (
      <div className="p-6 space-y-4">
        {fileInput}
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 text-center">
          Review Snapshot
        </h2>
        <p className="text-xs text-stone-400 text-center">
          {photoCount} photo{photoCount !== 1 ? 's' : ''} captured
        </p>

        {towers.map((tower, ti) => (
          <div key={tower.id} className="bg-stone-50 dark:bg-stone-700/30 rounded-xl p-3">
            <h3 className="text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">{tower.name}</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {TIER_LABELS.map((label, i) => {
                const key = `${tower.id}-tier-${i + 1}`;
                const has = state.photos.has(key);
                return (
                  <div key={i} className={`text-center py-2 rounded-lg text-[10px] ${
                    has ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-stone-100 dark:bg-stone-600 text-stone-400'
                  }`}>
                    <div>{has ? '✅' : '—'}</div>
                    <div className="mt-0.5">{label}</div>
                  </div>
                );
              })}
            </div>
            {state.overviews.has(tower.id) && (
              <div className="mt-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">✅ Overview photo</div>
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
          >
            Save Snapshot
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-3 border border-stone-200 dark:border-stone-600 text-stone-500 rounded-xl text-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// TIMELINE
// ══════════════════════════════════════════════════════════════════════════════

export function SnapshotTimeline({ onClose }: { onClose: () => void }) {
  const { snapshots } = useSnapshotStore();
  const region = useRegion();
  const { plantMap } = usePlantDb(region);
  const { photos } = usePhotoStore();

  // Compute diffs between consecutive snapshots
  const sessionsWithDiffs = useMemo(() => {
    return snapshots.map((session, i) => {
      const prev = snapshots[i + 1]; // older
      const diff = prev ? computeSnapshotDiff(prev, session, plantMap) : null;
      return { session, diff };
    });
  }, [snapshots, plantMap]);

  if (snapshots.length === 0) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-4xl">📸</div>
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">No Snapshots Yet</h2>
        <p className="text-sm text-stone-400">Take your first weekly snapshot to start tracking your garden's progress.</p>
        <button onClick={onClose} className="text-xs text-stone-400 hover:text-stone-600">← Back</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">📸 Garden Timeline</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl p-1">x</button>
      </div>

      {sessionsWithDiffs.map(({ session, diff }) => {
        const date = new Date(session.capturedAt);
        const dateLabel = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

        // Count photos
        let photoCount = 0;
        for (const tower of session.towers) {
          for (const tier of tower.tiers) {
            if (tier.photoId) photoCount++;
          }
          if (tower.overviewPhotoId) photoCount++;
        }

        // Get tier photo thumbnails
        const tierThumbs: { photoId: string; label: string }[] = [];
        for (const tower of session.towers) {
          for (const tier of tower.tiers) {
            if (tier.photoId) {
              const photo = photos.find(p => p.id === tier.photoId);
              if (photo) tierThumbs.push({ photoId: tier.photoId, label: `T${tier.tierNumber}` });
            }
          }
        }

        return (
          <div key={session.id} className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-100">{dateLabel}</span>
                  <span className="text-[10px] text-stone-400 ml-2">{photoCount} photos</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-stone-500">{session.totalPlanted} planted</span>
                  {session.totalReady > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{session.totalReady} ready</span>
                  )}
                  {session.weather && (
                    <span className="text-stone-400">{session.weather.minTemp.toFixed(0)}°/{session.weather.maxTemp.toFixed(0)}°</span>
                  )}
                </div>
              </div>

              {/* Photo thumbnails strip */}
              {tierThumbs.length > 0 && (
                <div className="flex gap-1.5 mb-2 overflow-x-auto">
                  {tierThumbs.slice(0, 6).map(({ photoId, label }) => {
                    const photo = photos.find(p => p.id === photoId);
                    return photo ? (
                      <div key={photoId} className="relative shrink-0">
                        <img src={photo.thumbnailDataUrl} alt={label} className="w-12 h-12 rounded-lg object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] bg-black/50 text-white rounded-b-lg">{label}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* Diff badges */}
              {diff && diff.changes.length > 0 && (
                <div className="space-y-1">
                  {diff.stageAdvances > 0 && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      🌿 {diff.stageAdvances} plant{diff.stageAdvances > 1 ? 's' : ''} advanced a stage
                    </div>
                  )}
                  {/* Show individual stage changes */}
                  {diff.changes
                    .filter(c => c.changeType === 'stage-advance')
                    .slice(0, 4)
                    .map((c) => (
                      <div key={c.pocketId} className="text-[10px] text-stone-500 ml-3">
                        {c.emoji} {c.plantName}: {c.oldStage && STAGE_EMOJI[c.oldStage]}{c.oldStage && STAGE_NAME[c.oldStage]} → {c.newStage && STAGE_EMOJI[c.newStage]}{c.newStage && STAGE_NAME[c.newStage]}
                      </div>
                    ))}
                  {diff.newPlantings > 0 && (
                    <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                      🆕 {diff.newPlantings} new planting{diff.newPlantings > 1 ? 's' : ''}
                    </div>
                  )}
                  {diff.removals > 0 && (
                    <div className="text-[10px] text-red-500">
                      ✕ {diff.removals} removed
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD WIDGET
// ══════════════════════════════════════════════════════════════════════════════

export function SnapshotDashboardWidget({ onStartSnapshot, onViewTimeline }: { onStartSnapshot: () => void; onViewTimeline: () => void }) {
  const { snapshots, getLatest, getPrevious } = useSnapshotStore();
  const region = useRegion();
  const { plantMap } = usePlantDb(region);
  const { photos } = usePhotoStore();

  const latest = getLatest();
  const previous = getPrevious();

  const diff = useMemo(() => {
    if (!latest || !previous) return null;
    return computeSnapshotDiff(previous, latest, plantMap);
  }, [latest, previous, plantMap]);

  // Days since last snapshot
  const daysSince = latest
    ? Math.floor((Date.now() - new Date(latest.capturedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysSince !== null && daysSince >= 7;

  // Get thumbnail strip from latest
  const thumbs: string[] = [];
  if (latest) {
    for (const tower of latest.towers) {
      for (const tier of tower.tiers) {
        if (tier.photoId) {
          const photo = photos.find(p => p.id === tier.photoId);
          if (photo) thumbs.push(photo.thumbnailDataUrl);
        }
      }
    }
  }

  return (
    <div className={`bg-white dark:bg-stone-800 rounded-2xl border overflow-hidden ${
      isOverdue ? 'border-amber-300 dark:border-amber-700' : 'border-stone-200 dark:border-stone-700'
    }`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">📸 Garden Snapshot</h2>
          {daysSince !== null && (
            <span className={`text-[10px] ${isOverdue ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-stone-400'}`}>
              {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}
              {isOverdue ? ' — time for a new one!' : ''}
            </span>
          )}
        </div>

        {!latest ? (
          <p className="text-xs text-stone-400 mb-3">Track your garden's progress with weekly photos. Snap each tier — the app captures growth stages automatically.</p>
        ) : (
          <>
            {/* Thumbnail strip */}
            {thumbs.length > 0 && (
              <div className="flex gap-1 mb-2 overflow-x-auto">
                {thumbs.slice(0, 5).map((src, i) => (
                  <img key={i} src={src} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ))}
                {thumbs.length > 5 && (
                  <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-[10px] text-stone-400 shrink-0">
                    +{thumbs.length - 5}
                  </div>
                )}
              </div>
            )}

            {/* Diff summary */}
            {diff && diff.changes.length > 0 && (
              <div className="text-[10px] text-stone-500 mb-2">
                Since last: {[
                  diff.stageAdvances > 0 && `${diff.stageAdvances} advanced`,
                  diff.newPlantings > 0 && `${diff.newPlantings} new`,
                  diff.removals > 0 && `${diff.removals} removed`,
                ].filter(Boolean).join(', ')}
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={onStartSnapshot}
            className={`flex-1 text-[11px] py-2 rounded-lg font-semibold transition-colors ${
              isOverdue
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {latest ? '📷 New Snapshot' : '📷 Take First Snapshot'}
          </button>
          {snapshots.length > 0 && (
            <button
              onClick={onViewTimeline}
              className="text-[11px] py-2 px-3 rounded-lg border border-stone-200 dark:border-stone-600 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
            >
              Timeline
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
