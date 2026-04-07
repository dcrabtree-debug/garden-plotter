import { useRef, useState } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { useGardenStore } from '../state/garden-store';
import { usePlantDb } from '../data/use-plant-db';
import { useRegion } from '../data/use-region';
import { useDarkMode } from '../hooks/use-dark-mode';
import { ESHER_ZONES, recommendPlantsForZone } from '../lib/microclimate-zones';
import { assessRenterRisk } from '../lib/renter-mode';

const LOCATION_PRESETS = [
  {
    id: 'surrey-uk',
    name: 'Walton-on-Thames, Surrey, UK',
    latitude: 51.3867,
    longitude: -0.4175,
    lastFrostDate: '04-15',
    firstFrostDate: '10-25',
    zone: 'RHS H5 / USDA 8b',
  },
  {
    id: 'manhattan-beach-ca',
    name: 'Manhattan Beach, CA, USA',
    latitude: 33.8847,
    longitude: -118.4109,
    lastFrostDate: '01-15',
    firstFrostDate: '12-15',
    zone: 'USDA 10b-11a',
  },
];

function MicroclimateZonesSection() {
  const region = useRegion();
  const { plants } = usePlantDb(region);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
      <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1">
        🗺️ Microclimate Zones — 21 Esher Avenue
      </h2>
      <p className="text-[10px] text-stone-400 mb-3">
        Each zone has different sun, shelter, and frost conditions. Tap a zone to see which plants fit best.
      </p>
      <div className="space-y-2">
        {ESHER_ZONES.map((zone) => {
          const isExpanded = expandedZone === zone.id;
          const recs = isExpanded ? recommendPlantsForZone(zone, plants) : [];
          const idealCount = recs.filter((r) => r.fit === 'ideal').length;
          const goodCount = recs.filter((r) => r.fit === 'good').length;

          return (
            <div key={zone.id}>
              <button
                onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                  isExpanded
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-700/50 hover:border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{zone.emoji}</span>
                    <div>
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">{zone.name}</div>
                      <div className="text-[10px] text-stone-400">
                        {zone.sunHoursEstimate}h sun · {zone.shelterLevel} shelter · {zone.frostProtection ? 'Frost-free' : 'No frost protection'}
                      </div>
                    </div>
                  </div>
                  <span className="text-stone-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </button>
              {isExpanded && (
                <div className="mt-1.5 ml-8 space-y-1">
                  <p className="text-[10px] text-stone-500 mb-2">{zone.description}</p>
                  <div className="text-[10px] text-stone-400 mb-1.5">
                    {idealCount} ideal · {goodCount} good · {recs.length} total matches
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {recs.slice(0, 15).map((rec) => (
                      <div key={rec.plant.slug} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-stone-50 dark:bg-stone-700/30">
                        <span className="text-sm">{rec.plant.emoji}</span>
                        <span className="text-[10px] font-medium text-stone-700 dark:text-stone-200 flex-1 truncate">{rec.plant.commonName}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${
                          rec.fit === 'ideal' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                          rec.fit === 'good' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                          'bg-stone-100 dark:bg-stone-600 text-stone-500 dark:text-stone-300'
                        }`}>{rec.fit}</span>
                      </div>
                    ))}
                    {recs.length > 15 && (
                      <div className="text-[9px] text-stone-400 px-2">+{recs.length - 15} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const exportPlannerState = usePlannerStore((s) => s.exportState);
  const importPlannerState = usePlannerStore((s) => s.importState);
  const resetAll = usePlannerStore((s) => s.resetAll);
  const settings = usePlannerStore((s) => s.settings);
  const { isDark, toggle: toggleDark } = useDarkMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPreset, setSelectedPreset] = useState(
    LOCATION_PRESETS.find((p) => p.name === settings.location)?.id ?? 'surrey-uk'
  );

  const handleExport = () => {
    const plannerData = exportPlannerState();
    const gardenData = useGardenStore.getState().garden;
    const fullExport = {
      ...plannerData,
      garden: gardenData,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(fullExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garden-plotter-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.version && data.towers) {
          importPlannerState(data);
          // Also restore garden map if included in export
          if (data.garden?.cells && data.garden?.config) {
            useGardenStore.getState().loadTemplate(data.garden.config, data.garden.cells);
          }
          alert('Garden plan imported successfully!' + (data.garden ? ' (includes in-ground garden map)' : ' (GreenStalks only)'));
        } else {
          alert('Invalid garden plan file.');
        }
      } catch {
        alert('Could not parse file. Please select a valid garden plan JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('This will clear all your towers and start fresh. Are you sure?')) {
      resetAll();
    }
  };

  const updateSettings = usePlannerStore((s) => s.updateSettings);

  const handleLocationChange = (presetId: string) => {
    const preset = LOCATION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    updateSettings({
      ...settings,
      location: preset.name,
      lastFrostDate: preset.lastFrostDate,
      firstFrostDate: preset.firstFrostDate,
      latitude: preset.latitude,
      longitude: preset.longitude,
    });
  };

  const activePreset = LOCATION_PRESETS.find((p) => p.id === selectedPreset);

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-stone-700 dark:text-stone-300">Dark Mode</div>
              <div className="text-xs text-stone-400">
                {isDark ? 'Dark theme active' : 'Light theme active'}
              </div>
            </div>
            <button
              onClick={toggleDark}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isDark ? 'bg-emerald-600' : 'bg-stone-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isDark ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
            Growing Location
          </h2>
          <div className="space-y-3">
            {LOCATION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleLocationChange(preset.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                  selectedPreset === preset.id
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-stone-200 dark:border-stone-600 hover:border-stone-300'
                }`}
              >
                <div className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  {preset.name}
                </div>
                <div className="flex gap-4 text-[10px] text-stone-400 mt-1">
                  <span>Zone: {preset.zone}</span>
                  <span>Last frost: {preset.lastFrostDate}</span>
                  <span>First frost: {preset.firstFrostDate}</span>
                </div>
              </button>
            ))}
          </div>
          {activePreset && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-500 dark:text-stone-400">
              <div>
                <span className="font-medium">Latitude:</span> {activePreset.latitude}
              </div>
              <div>
                <span className="font-medium">Longitude:</span> {activePreset.longitude}
              </div>
            </div>
          )}
        </div>

        {/* Renter Mode */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
            🏠 Renter Mode
          </h2>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-stone-700 dark:text-stone-300">Renter-Safe Filtering</div>
              <div className="text-xs text-stone-400">
                Warns about plants that need permanent structures, stain paving, or spread invasively
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              Always On
            </div>
          </div>
          <div className="text-[10px] text-stone-400 space-y-1">
            <p>🟢 <strong>Safe:</strong> Container-grown, fully reversible — GreenStalk pockets, pots, window boxes</p>
            <p>🟡 <strong>Caution:</strong> Invasive species (mint, lemon balm) — keep in containers only</p>
            <p>🔴 <strong>Risky:</strong> Needs permanent planting or structures — get landlord permission first</p>
          </div>
        </div>

        {/* Microclimate Zones */}
        <MicroclimateZonesSection />

        {/* Export / Import */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-5">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
            Backup & Restore
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm bg-stone-800 dark:bg-stone-600 text-white rounded-lg hover:bg-stone-700 dark:hover:bg-stone-500 transition-colors"
            >
              Export Garden Plan
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors"
            >
              Import Garden Plan
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
          <p className="text-[10px] text-stone-400 mt-2">
            Your plan auto-saves to your browser. Use export for backups.
          </p>
        </div>

        {/* Reset */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900 p-5">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
            Danger Zone
          </h2>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            Reset Everything
          </button>
          <p className="text-[10px] text-stone-400 mt-2">
            Clears all towers and starts fresh. Export your plan first!
          </p>
        </div>
      </div>
    </div>
  );
}
