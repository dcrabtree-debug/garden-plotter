import type { Plant } from '../../types/plant';
import type { CompanionEdge, CompanionMap } from '../../types/companion';
import { getMonthName, isInWindow } from '../../lib/calendar-utils';

interface PlantDetailProps {
  plant: Plant;
  companionMap: CompanionMap;
  onClose: () => void;
}

function WindowBar({
  label,
  color,
  window,
}: {
  label: string;
  color: string;
  window: [number, number] | null;
}) {
  if (!window) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-stone-500">{label}</span>
      <div className="flex gap-px flex-1">
        {Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const active = isInWindow(month, window);
          return (
            <div
              key={month}
              className={`flex-1 h-4 rounded-sm text-[8px] flex items-center justify-center ${
                active ? color : 'bg-stone-100 dark:bg-stone-700'
              }`}
              title={getMonthName(month)}
            >
              {getMonthName(month)[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlantDetail({ plant, companionMap, onClose }: PlantDetailProps) {
  const edges = companionMap.get(plant.slug);
  const friends: CompanionEdge[] = [];
  const foes: CompanionEdge[] = [];
  if (edges) {
    for (const edge of edges.values()) {
      if (edge.relationship === 'friend') friends.push(edge);
      else if (edge.relationship === 'foe') foes.push(edge);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl w-full max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{plant.emoji}</span>
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
                  {plant.commonName}
                </h2>
              </div>
              <p className="text-xs text-stone-400 italic mt-0.5">
                {plant.botanicalName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 text-lg"
            >
              x
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-stone-50 dark:bg-stone-700 rounded-lg p-2 text-center">
              <div className="text-[10px] text-stone-400">Sun</div>
              <div className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {plant.sun.replace('-', ' ')}
              </div>
            </div>
            <div className="bg-stone-50 dark:bg-stone-700 rounded-lg p-2 text-center">
              <div className="text-[10px] text-stone-400">Water</div>
              <div className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {plant.water}
              </div>
            </div>
            <div className="bg-stone-50 dark:bg-stone-700 rounded-lg p-2 text-center">
              <div className="text-[10px] text-stone-400">Harvest</div>
              <div className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {plant.daysToHarvest[0]}-{plant.daysToHarvest[1]}d
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">
              Planting Calendar (Surrey)
            </h3>
            <div className="space-y-1">
              <WindowBar
                label="Sow indoors"
                color="bg-sky-200 text-sky-800"
                window={plant.plantingWindow.sowIndoors}
              />
              <WindowBar
                label="Sow outdoors"
                color="bg-emerald-200 text-emerald-800"
                window={plant.plantingWindow.sowOutdoors}
              />
              <WindowBar
                label="Transplant"
                color="bg-amber-200 text-amber-800"
                window={plant.plantingWindow.transplant}
              />
              <WindowBar
                label="Harvest"
                color="bg-rose-200 text-rose-800"
                window={plant.plantingWindow.harvest}
              />
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
              GreenStalk Notes
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400">{plant.greenstalkNotes}</p>
            <div className="flex gap-1 mt-1.5">
              {plant.idealTiers.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full"
                >
                  Tier {t}
                </span>
              ))}
            </div>
          </div>

          {/* Soil & In-Ground Data (Hessayon) */}
          {(plant as any).soil && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Soil Requirements
              </h3>
              <div className="text-sm text-stone-600 dark:text-stone-400 space-y-0.5">
                <div><span className="text-xs text-stone-400">pH:</span> {(plant as any).soil.phRange[0]} - {(plant as any).soil.phRange[1]}</div>
                <div><span className="text-xs text-stone-400">Type:</span> {(plant as any).soil.type}</div>
                {(plant as any).soil.notes && <div className="text-xs text-stone-500">{(plant as any).soil.notes}</div>}
              </div>
            </div>
          )}

          {(plant as any).inGround && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                In-Ground Growing
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
                <div><span className="text-stone-400">Row spacing:</span> {(plant as any).inGround.rowSpacingCm}cm</div>
                <div><span className="text-stone-400">Plant spacing:</span> {(plant as any).inGround.plantSpacingCm}cm</div>
                <div><span className="text-stone-400">Sow depth:</span> {(plant as any).inGround.sowDepthCm}cm</div>
                <div><span className="text-stone-400">Yield:</span> {(plant as any).inGround.expectedYieldPerM2}</div>
                <div><span className="text-stone-400">Rotation:</span> {(plant as any).inGround.rotation}</div>
                <div><span className="text-stone-400">Bed type:</span> {(plant as any).inGround.bedType}</div>
              </div>
              {(plant as any).inGround.feeding && (
                <div className="mt-1.5 text-xs text-stone-500">
                  <span className="font-medium">Feeding:</span> {(plant as any).inGround.feeding}
                </div>
              )}
              {(plant as any).inGround.pests?.length > 0 && (
                <div className="mt-1 text-xs text-stone-500">
                  <span className="font-medium text-amber-600">Pests:</span> {(plant as any).inGround.pests.join(', ')}
                </div>
              )}
              {(plant as any).inGround.diseases?.length > 0 && (
                <div className="mt-0.5 text-xs text-stone-500">
                  <span className="font-medium text-red-600">Diseases:</span> {(plant as any).inGround.diseases.join(', ')}
                </div>
              )}
            </div>
          )}

          {plant.varieties.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Recommended Varieties
              </h3>
              <div className="space-y-1">
                {plant.varieties.map((v) => (
                  <div key={v.name} className="text-sm text-stone-600 dark:text-stone-400">
                    <span className="font-medium">{v.name}</span> — {v.notes}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(friends.length > 0 || foes.length > 0) && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Companion Planting
              </h3>
              {friends.length > 0 && (
                <div className="mb-2">
                  <span className="text-[10px] text-emerald-600 font-medium">
                    Friends:
                  </span>
                  {friends.map((f) => (
                    <div
                      key={f.plantB}
                      className="text-xs text-stone-500 ml-2"
                    >
                      {f.plantB.replace(/-/g, ' ')} — {f.reason}
                    </div>
                  ))}
                </div>
              )}
              {foes.length > 0 && (
                <div>
                  <span className="text-[10px] text-red-600 font-medium">
                    Foes:
                  </span>
                  {foes.map((f) => (
                    <div
                      key={f.plantB}
                      className="text-xs text-stone-500 ml-2"
                    >
                      {f.plantB.replace(/-/g, ' ')} — {f.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {plant.notes && (
            <div className="text-sm text-stone-500 border-t border-stone-100 dark:border-stone-700 pt-3">
              {plant.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
