export interface Pocket {
  id: string;
  plantSlug: string | null;
  plantedDate: string | null;
}

export interface Tier {
  tierNumber: number;
  pockets: Pocket[];
}

export interface Tower {
  id: string;
  name: string;
  tiers: Tier[];
}

export interface RaisedBed {
  id: string;
  name: string;
  widthCells: number;
  heightCells: number;
  cellSizeCm: number;
  cells: (string | null)[][];
}

// In-ground garden types
export type GardenFacing = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type CellType =
  | 'empty'
  | 'lawn'
  | 'veg-patch'
  | 'flower-bed'
  | 'patio'
  | 'path'
  | 'tree'
  | 'shed'
  | 'raised-bed'
  | 'water-feature'
  | 'compost'
  | 'greenstalk'
  | 'conservatory';

export interface GardenCell {
  type: CellType;
  plantSlug: string | null;
  sunHours: number | null;
}

export interface GardenConfig {
  widthM: number;
  depthM: number;
  cellSizeM: number;
  facing: GardenFacing;
  houseWallHeightM: number;
  fenceHeightM: number;
  latitude: number;
  longitude: number;
}

export interface Garden {
  id: string;
  name: string;
  config: GardenConfig;
  cells: GardenCell[][];
}

export interface Settings {
  lastFrostDate: string;
  firstFrostDate: string;
  location: string;
  latitude: number;
  longitude: number;
}

export interface SaveState {
  version: number;
  towers: Tower[];
  raisedBeds: RaisedBed[];
  gardens: Garden[];
  settings: Settings;
}
