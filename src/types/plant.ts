export type SunLevel = 'full-sun' | 'partial-shade' | 'full-shade';
export type WaterNeed = 'low' | 'moderate' | 'high';
export type GrowthHabit = 'trailing' | 'upright' | 'bushy' | 'climbing' | 'rosette' | 'spreading';
export type PlantCategory = 'vegetable' | 'herb' | 'fruit' | 'flower' | 'legume' | 'fern';
export type RHSHardiness = 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'H7';

export interface PlantingWindow {
  sowIndoors: [number, number] | null;
  sowOutdoors: [number, number] | null;
  transplant: [number, number] | null;
  harvest: [number, number] | null;
}

export interface PlantVariety {
  name: string;
  notes: string;
  containerFriendly: boolean;
}

export interface SoilPreference {
  phRange: [number, number];
  type: string;
  notes: string;
}

export interface InGroundData {
  rowSpacingCm: number;
  plantSpacingCm: number;
  sowDepthCm: number;
  bedType: 'raised' | 'flat' | 'either';
  expectedYieldPerM2: string;
  rotation: 'legumes' | 'brassicas' | 'roots-onions' | 'potatoes' | 'permanent' | 'any';
  feeding: string;
  pests: string[];
  diseases: string[];
  commonProblems: string;
}

export interface Plant {
  slug: string;
  commonName: string;
  botanicalName: string;
  category: PlantCategory;
  emoji: string;
  sun: SunLevel;
  water: WaterNeed;
  spacingCm: number;
  depthCm: number;
  growthHabit: GrowthHabit;
  daysToHarvest: [number, number];
  plantingWindow: PlantingWindow;
  hardiness: RHSHardiness;
  soil: SoilPreference;
  inGround: InGroundData;
  greenstalkSuitability: 'ideal' | 'good' | 'marginal' | 'unsuitable';
  greenstalkNotes: string;
  idealTiers: number[];
  varieties: PlantVariety[];
  notes: string;
  sources: string[];
  childSafe?: boolean;
  petSafe?: boolean;
  toxicWarning?: string;
  kidActivity?: string;
  soilTipSurrey?: string;
  soilTemp?: { min: number; max: number };
}
