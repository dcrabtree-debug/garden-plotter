import { useState, useRef, useCallback, useEffect } from 'react';
import {
  usePhotoStore,
  SYMPTOM_LIBRARY,
  type GardenPhoto,
  type HealthSymptom,
  type PhotoAssessment,
} from '../state/photo-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import { SnapshotCaptureFlow, SnapshotTimeline } from '../components/SnapshotFlow';

// ── Component ───────────────────────────────────────────────────────────────

type View = 'gallery' | 'assess' | 'detail' | 'snapshot' | 'timeline';

export function PhotoCoachPage({ initialView }: { initialView?: View }) {
  const { photos, addPhoto, removePhoto, updateAssessment, getFullImage } = usePhotoStore();
  const region = useRegion();
  const { plants } = usePlantDb(region);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>(initialView ?? 'gallery');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Assessment form state
  const [assessPlantSlug, setAssessPlantSlug] = useState<string | null>(null);
  const [assessLocation, setAssessLocation] = useState<GardenPhoto['location']>('general');
  const [assessSymptoms, setAssessSymptoms] = useState<Set<HealthSymptom>>(new Set());
  const [assessNotes, setAssessNotes] = useState('');

  // Full image viewer
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId) ?? null;

  // ── Upload handlers ─────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    setUploading(true);
    for (const file of imageFiles) {
      const id = await addPhoto(file, null, 'general');
      if (imageFiles.length === 1) {
        setSelectedPhotoId(id);
        setView('assess');
      }
    }
    setUploading(false);
  }, [addPhoto]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  }, [handleFiles]);

  // ── Assessment handlers ─────────────────────────────────────────────────

  const toggleSymptom = (s: HealthSymptom) => {
    setAssessSymptoms((prev) => {
      const next = new Set(prev);
      if (s === 'healthy') {
        // Clear all others
        return new Set(['healthy']);
      }
      next.delete('healthy');
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const saveAssessment = () => {
    if (!selectedPhotoId) return;
    const assessment: PhotoAssessment = {
      symptoms: [...assessSymptoms],
      notes: assessNotes,
      assessedAt: new Date().toISOString(),
    };
    updateAssessment(selectedPhotoId, assessment);
    setView('detail');
  };

  const startAssess = (photo: GardenPhoto) => {
    setSelectedPhotoId(photo.id);
    setAssessPlantSlug(photo.plantSlug);
    setAssessLocation(photo.location);
    setAssessSymptoms(new Set(photo.assessment?.symptoms ?? []));
    setAssessNotes(photo.assessment?.notes ?? '');
    setView('assess');
  };

  const viewDetail = (photo: GardenPhoto) => {
    setSelectedPhotoId(photo.id);
    setView('detail');
  };

  // Load full image for detail view
  useEffect(() => {
    if (view === 'detail' && selectedPhotoId) {
      getFullImage(selectedPhotoId).then(setFullImageUrl);
    }
    return () => {
      if (fullImageUrl) URL.revokeObjectURL(fullImageUrl);
    };
  }, [view, selectedPhotoId]);

  // ── Gallery View ──────────────────────────────────────────────────────────

  // ── Snapshot / Timeline views ──────────────────────────────────────────────

  if (view === 'snapshot') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-md mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <SnapshotCaptureFlow
            onComplete={() => setView('timeline')}
            onCancel={() => setView('gallery')}
          />
        </div>
      </div>
    );
  }

  if (view === 'timeline') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-lg mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <SnapshotTimeline onClose={() => setView('gallery')} />
        </div>
      </div>
    );
  }

  if (view === 'gallery') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
                📸 Garden Coach
              </h1>
              <p className="text-sm text-stone-400 mt-0.5">
                Upload garden photos for health assessment and care recommendations
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setView('snapshot')}
                className="px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                📷 Weekly Snapshot
              </button>
              <button
                onClick={() => setView('timeline')}
                className="px-3 py-2 border border-stone-200 dark:border-stone-600 text-stone-500 text-xs rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                Timeline
              </button>
            </div>
          </div>

          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              dragOver
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-stone-300 dark:border-stone-600 hover:border-emerald-400 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            {uploading ? (
              <div className="text-stone-500 dark:text-stone-400">
                <div className="text-3xl mb-2 animate-pulse">📤</div>
                <p className="text-sm font-medium">Uploading...</p>
              </div>
            ) : (
              <>
                <div className="text-3xl mb-2">📷</div>
                <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                  Drop photos here, or tap to take/upload
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Snap a photo of any plant for a health check
                </p>
              </>
            )}
          </div>

          {/* Action items from recent assessments */}
          {(() => {
            const recentActions = photos
              .filter((p) => p.actions.length > 0 && p.assessment)
              .slice(0, 3);
            if (recentActions.length === 0) return null;
            return (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4">
                <h2 className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2">
                  ⚡ Action Items from Assessments
                </h2>
                <div className="space-y-1.5">
                  {recentActions.flatMap((p) =>
                    p.actions.slice(0, 2).map((action, i) => {
                      const plant = p.plantSlug ? plants.find((pl) => pl.slug === p.plantSlug) : null;
                      return (
                        <div key={`${p.id}-${i}`} className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-100">
                          <span className="text-amber-500 mt-0.5">→</span>
                          <span>
                            {plant ? `${plant.emoji} ${plant.commonName}: ` : ''}
                            {action}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* Photo grid */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => {
                const plant = photo.plantSlug ? plants.find((p) => p.slug === photo.plantSlug) : null;
                const hasIssues = photo.assessment && !photo.assessment.symptoms.includes('healthy') && photo.assessment.symptoms.length > 0;
                return (
                  <div
                    key={photo.id}
                    className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all group"
                    onClick={() => photo.assessment ? viewDetail(photo) : startAssess(photo)}
                  >
                    <img
                      src={photo.thumbnailDataUrl}
                      alt={plant?.commonName ?? 'Garden photo'}
                      className="w-full aspect-square object-cover"
                    />
                    {/* Status overlay */}
                    <div className="absolute top-1.5 right-1.5 flex gap-1">
                      {hasIssues && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">
                          ⚠️ {photo.assessment!.symptoms.length}
                        </span>
                      )}
                      {photo.assessment?.symptoms.includes('healthy') && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                          ✅
                        </span>
                      )}
                      {!photo.assessment && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                          Assess
                        </span>
                      )}
                    </div>
                    {/* Bottom info */}
                    <div className="px-2 py-1.5">
                      <div className="text-[11px] font-medium text-stone-700 dark:text-stone-200 truncate">
                        {plant ? `${plant.emoji} ${plant.commonName}` : photo.location}
                      </div>
                      <div className="text-[9px] text-stone-400">
                        {new Date(photo.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                      className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-stone-400">
              <div className="text-4xl mb-3">🌿</div>
              <p className="text-sm">No photos yet. Take a photo of your garden to get started!</p>
              <p className="text-xs mt-1">Track plant health, spot problems early, and get expert recommendations.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Assessment View ───────────────────────────────────────────────────────

  if (view === 'assess' && selectedPhoto) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Back button */}
          <button
            onClick={() => setView('gallery')}
            className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 flex items-center gap-1"
          >
            ← Back to gallery
          </button>

          {/* Photo preview */}
          <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
            <img
              src={selectedPhoto.thumbnailDataUrl}
              alt="Assessment photo"
              className="w-full max-h-64 object-cover"
            />
          </div>

          {/* Plant selector */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-2">Which plant is this?</h3>
            <select
              value={assessPlantSlug ?? ''}
              onChange={(e) => setAssessPlantSlug(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-xs text-stone-700 dark:text-stone-200"
            >
              <option value="">General / Unknown</option>
              {plants.map((p) => (
                <option key={p.slug} value={p.slug}>{p.emoji} {p.commonName}</option>
              ))}
            </select>

            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 mt-3 mb-2">Where is it?</h3>
            <div className="flex gap-2 flex-wrap">
              {(['greenstalk', 'in-ground', 'conservatory', 'general'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setAssessLocation(loc)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    assessLocation === loc
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:border-emerald-400'
                  }`}
                >
                  {loc === 'greenstalk' ? '🌱 GreenStalk' : loc === 'in-ground' ? '🏡 In-Ground' : loc === 'conservatory' ? '🏠 Conservatory' : '📍 General'}
                </button>
              ))}
            </div>
          </div>

          {/* Symptom picker */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-1">What do you see?</h3>
            <p className="text-[10px] text-stone-400 mb-3">Select all symptoms that apply</p>
            <div className="grid grid-cols-2 gap-2">
              {SYMPTOM_LIBRARY.map((s) => {
                const selected = assessSymptoms.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSymptom(s.id)}
                    className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                      selected
                        ? s.id === 'healthy'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200'
                          : s.severity === 'high'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-800 dark:text-red-200'
                            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200'
                        : 'border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-base mr-1">{s.emoji}</span>
                    <span className="font-medium">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-4">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-2">Notes (optional)</h3>
            <textarea
              value={assessNotes}
              onChange={(e) => setAssessNotes(e.target.value)}
              placeholder="Anything else you notice? e.g., 'only the lower leaves are affected' or 'started after heavy rain'"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-xs text-stone-700 dark:text-stone-200 placeholder:text-stone-400 resize-none"
            />
          </div>

          {/* Save button */}
          <button
            onClick={saveAssessment}
            disabled={assessSymptoms.size === 0}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {assessSymptoms.size === 0 ? 'Select symptoms to continue' : '💊 Get Diagnosis & Recommendations'}
          </button>
        </div>
      </div>
    );
  }

  // ── Detail View (diagnosis results) ───────────────────────────────────────

  if (view === 'detail' && selectedPhoto) {
    const plant = selectedPhoto.plantSlug ? plants.find((p) => p.slug === selectedPhoto.plantSlug) : null;
    const isHealthy = selectedPhoto.assessment?.symptoms.includes('healthy');
    const symptoms = (selectedPhoto.assessment?.symptoms ?? [])
      .map((id) => SYMPTOM_LIBRARY.find((s) => s.id === id))
      .filter(Boolean);

    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Back button */}
          <button
            onClick={() => setView('gallery')}
            className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 flex items-center gap-1"
          >
            ← Back to gallery
          </button>

          {/* Photo */}
          <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
            <img
              src={fullImageUrl ?? selectedPhoto.thumbnailDataUrl}
              alt={plant?.commonName ?? 'Garden photo'}
              className="w-full max-h-80 object-cover"
            />
          </div>

          {/* Plant & location info */}
          <div className="flex items-center gap-3">
            {plant && (
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {plant.emoji} {plant.commonName}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-500">
              {selectedPhoto.location}
            </span>
            <span className="text-[10px] text-stone-400">
              {new Date(selectedPhoto.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Overall status */}
          <div className={`rounded-2xl p-4 border ${
            isHealthy
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isHealthy ? '✅' : '🩺'}</span>
              <div>
                <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                  {isHealthy ? 'Looking Good!' : `${symptoms.length} Issue${symptoms.length > 1 ? 's' : ''} Found`}
                </h2>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  {isHealthy ? 'No issues detected. Keep up your care routine.' : 'Review the diagnosis below and take action.'}
                </p>
              </div>
            </div>
          </div>

          {/* Diagnosis cards */}
          {!isHealthy && symptoms.map((s) => {
            if (!s) return null;
            return (
              <div
                key={s.id}
                className={`bg-white dark:bg-stone-800 rounded-2xl border p-4 ${
                  s.severity === 'high' ? 'border-red-200 dark:border-red-800' :
                  s.severity === 'medium' ? 'border-amber-200 dark:border-amber-800' :
                  'border-stone-200 dark:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{s.emoji}</span>
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">{s.label}</h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    s.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                    s.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                    'bg-stone-100 dark:bg-stone-600 text-stone-500'
                  }`}>
                    {s.severity}
                  </span>
                </div>

                <div className="mb-3">
                  <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Likely Causes</h4>
                  <ul className="space-y-0.5">
                    {s.causes.map((c, i) => (
                      <li key={i} className="text-xs text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                        <span className="text-stone-400 mt-0.5">•</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">What To Do</h4>
                  <ul className="space-y-0.5">
                    {s.actions.map((a, i) => (
                      <li key={i} className="text-xs text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5">→</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}

          {/* Notes */}
          {selectedPhoto.assessment?.notes && (
            <div className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3 border border-stone-200 dark:border-stone-700">
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Your Notes</h4>
              <p className="text-xs text-stone-600 dark:text-stone-300">{selectedPhoto.assessment.notes}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => startAssess(selectedPhoto)}
              className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-medium text-xs hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
            >
              🔄 Re-assess
            </button>
            <button
              onClick={() => { removePhoto(selectedPhoto.id); setView('gallery'); }}
              className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium text-xs hover:bg-red-100 transition-colors"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center justify-center h-full text-stone-400">
      <button onClick={() => setView('gallery')} className="text-sm hover:text-stone-600">
        ← Return to gallery
      </button>
    </div>
  );
}
