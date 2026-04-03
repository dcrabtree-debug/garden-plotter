import { useRef } from 'react';
import { usePlannerStore } from '../state/planner-store';

export function SettingsPage() {
  const exportState = usePlannerStore((s) => s.exportState);
  const importState = usePlannerStore((s) => s.importState);
  const resetAll = usePlannerStore((s) => s.resetAll);
  const settings = usePlannerStore((s) => s.settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (
      window.confirm(
        'This will clear all your towers and start fresh. Are you sure?'
      )
    ) {
      resetAll();
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-stone-800 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Location */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">
            Growing Location
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-stone-500">Location</label>
              <div className="text-sm text-stone-700 mt-0.5">
                {settings.location}
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-500">Frost Dates</label>
              <div className="text-sm text-stone-700 mt-0.5">
                Last frost: {settings.lastFrostDate} | First frost:{' '}
                {settings.firstFrostDate}
              </div>
            </div>
          </div>
        </div>

        {/* Export / Import */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">
            Backup & Restore
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
            >
              Export Garden Plan
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm bg-white border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
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
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
          <h2 className="text-sm font-semibold text-red-600 mb-2">
            Danger Zone
          </h2>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
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
