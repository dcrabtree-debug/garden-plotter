import { useRef, useState } from 'react';
import { usePlannerStore } from '../state/planner-store';
import { useDarkMode } from '../hooks/use-dark-mode';

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

export function SettingsPage() {
  const exportState = usePlannerStore((s) => s.exportState);
  const importState = usePlannerStore((s) => s.importState);
  const resetAll = usePlannerStore((s) => s.resetAll);
  const settings = usePlannerStore((s) => s.settings);
  const { isDark, toggle: toggleDark } = useDarkMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPreset, setSelectedPreset] = useState(
    LOCATION_PRESETS.find((p) => p.name === settings.location)?.id ?? 'surrey-uk'
  );

  const handleExport = () => {
    const data = exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
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
          importState(data);
          alert('Garden plan imported successfully!');
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
    <div className="h-full overflow-y-auto p-6 max-w-2xl mx-auto">
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
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-stone-500 dark:text-stone-400">
              <div>
                <span className="font-medium">Latitude:</span> {activePreset.latitude}
              </div>
              <div>
                <span className="font-medium">Longitude:</span> {activePreset.longitude}
              </div>
            </div>
          )}
        </div>

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
