import { usePlannerStore } from '../state/planner-store';

export function useRegion(): 'uk' | 'us' {
  const location = usePlannerStore((s) => s.settings.location);
  const isUS =
    location.includes('USA') ||
    location.includes('CA,') ||
    location.includes('Manhattan');
  return isUS ? 'us' : 'uk';
}
