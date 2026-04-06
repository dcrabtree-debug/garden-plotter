import { create } from 'zustand';

// ── Types ───────────────────────────────────────────────────────────────────

export type HealthSymptom =
  | 'wilting'
  | 'yellow-leaves'
  | 'brown-spots'
  | 'holes-in-leaves'
  | 'white-powder'
  | 'stunted-growth'
  | 'bolting'
  | 'leggy'
  | 'drooping'
  | 'crispy-edges'
  | 'black-spots'
  | 'sticky-residue'
  | 'mould'
  | 'root-rot'
  | 'pest-visible'
  | 'flowers-dropping'
  | 'fruit-rot'
  | 'healthy';

export interface SymptomInfo {
  id: HealthSymptom;
  label: string;
  emoji: string;
  causes: string[];
  actions: string[];
  severity: 'low' | 'medium' | 'high';
}

export const SYMPTOM_LIBRARY: SymptomInfo[] = [
  { id: 'healthy', label: 'Healthy', emoji: '✅', causes: ['No issues detected'], actions: ['Keep up current care routine'], severity: 'low' },
  { id: 'wilting', label: 'Wilting', emoji: '🥀', causes: ['Underwatering (most common in GreenStalks)', 'Heat stress', 'Root rot from overwatering', 'Transplant shock'], actions: ['Check soil moisture — water immediately if dry', 'Move to partial shade if in extreme heat', 'If soil is soggy, check drainage holes', 'For transplant shock: shade for 2-3 days, keep moist'], severity: 'high' },
  { id: 'yellow-leaves', label: 'Yellow leaves', emoji: '💛', causes: ['Nitrogen deficiency', 'Overwatering', 'Natural lower leaf die-off', 'Magnesium deficiency (tomatoes)'], actions: ['Apply balanced liquid feed', 'Check drainage and reduce watering if soggy', 'Remove affected lower leaves — normal for tomatoes', 'Epsom salt spray for magnesium (1 tbsp per gallon)'], severity: 'medium' },
  { id: 'brown-spots', label: 'Brown spots', emoji: '🟤', causes: ['Fungal infection (septoria, blight)', 'Sunburn', 'Chemical splash', 'Bacterial leaf spot'], actions: ['Remove affected leaves immediately', 'Improve air circulation — thin crowded growth', 'Avoid overhead watering', 'Copper-based fungicide as last resort'], severity: 'high' },
  { id: 'holes-in-leaves', label: 'Holes in leaves', emoji: '🕳️', causes: ['Slugs and snails', 'Caterpillars', 'Flea beetle', 'Earwigs'], actions: ['Check for slugs at night with a torch', 'Beer traps or nematode treatment (Nemaslug)', 'Check leaf undersides for caterpillars — pick off', 'Flea beetle: fleece cover, cosmetic damage usually tolerable'], severity: 'medium' },
  { id: 'white-powder', label: 'White powdery coating', emoji: '🤍', causes: ['Powdery mildew — very common in late summer', 'Poor air circulation', 'Drought stress weakens resistance'], actions: ['Improve airflow — space plants, remove lower leaves', 'Water at base, never overhead', 'Milk spray (1:9 milk to water) is effective organic treatment', 'Remove severely affected leaves'], severity: 'medium' },
  { id: 'stunted-growth', label: 'Stunted growth', emoji: '📏', causes: ['Nutrient deficiency', 'Root-bound in small container', 'Cold soil/air temperature', 'Compacted soil'], actions: ['Start regular liquid feeding', 'Repot if roots are circling the container', 'Wait for warmer weather — growth resumes above 10°C', 'Add compost mulch for in-ground plants'], severity: 'medium' },
  { id: 'bolting', label: 'Bolting (going to seed)', emoji: '🌸', causes: ['Heat stress (lettuce, spinach, coriander)', 'Long days trigger flowering', 'Irregular watering'], actions: ['Harvest remaining edible parts immediately', 'Replace with new plants — cannot reverse bolting', 'Sow bolt-resistant varieties next time', 'Provide afternoon shade for prone crops'], severity: 'high' },
  { id: 'leggy', label: 'Leggy / stretched', emoji: '📐', causes: ['Insufficient light', 'Too warm for the light level', 'Overcrowded seedlings'], actions: ['Move to brightest position available', 'Turn seedlings daily for even growth', 'Pot on individually with stem buried deeper', 'Pinch out growing tip to encourage bushing'], severity: 'low' },
  { id: 'drooping', label: 'Drooping (not wilting)', emoji: '😔', causes: ['Overwatering', 'Temperature shock (cold night)', 'Root damage'], actions: ['Let soil dry out before next watering', 'Check roots for brown/mushy sections (root rot)', 'Protect from cold nights with fleece'], severity: 'medium' },
  { id: 'crispy-edges', label: 'Crispy leaf edges', emoji: '🔥', causes: ['Underwatering / low humidity', 'Wind burn', 'Fertiliser burn (too much feed)', 'Salt build-up in container'], actions: ['Increase watering frequency', 'Shield from strong wind', 'Flush container with plain water if over-fed', 'Reduce feed concentration by half'], severity: 'medium' },
  { id: 'black-spots', label: 'Black spots', emoji: '⚫', causes: ['Late blight (tomatoes — serious)', 'Bacterial canker', 'Black spot fungus'], actions: ['If tomato blight: remove plant immediately, bag and bin', 'Do NOT compost blight-affected material', 'Improve ventilation for future prevention', 'Copper spray preventatively in wet summers'], severity: 'high' },
  { id: 'sticky-residue', label: 'Sticky residue on leaves', emoji: '🍯', causes: ['Aphid honeydew', 'Scale insects', 'Whitefly'], actions: ['Check leaf undersides for aphids', 'Blast with water or squash by hand', 'Encourage ladybirds — natural predators', 'Neem oil spray for severe infestations'], severity: 'medium' },
  { id: 'mould', label: 'Grey mould / fuzzy growth', emoji: '🦠', causes: ['Botrytis (grey mould) — very common in damp conditions', 'Poor ventilation', 'Dead plant material left in contact'], actions: ['Remove all affected parts immediately', 'Improve air circulation drastically', 'Remove dead leaves/flowers promptly', 'Water at base only, morning watering is best'], severity: 'high' },
  { id: 'root-rot', label: 'Root rot', emoji: '💀', causes: ['Persistent overwatering', 'Blocked drainage holes', 'Compacted soil holding water'], actions: ['Check GreenStalk drainage holes — clear blockages', 'Repot in fresh compost with extra perlite', 'Reduce watering frequency', 'If severe: remove affected roots, treat with cinnamon powder'], severity: 'high' },
  { id: 'pest-visible', label: 'Visible pests', emoji: '🐛', causes: ['Aphids (green/black clusters)', 'Caterpillars', 'Vine weevil grubs (white C-shaped)', 'Red spider mite (fine webbing)'], actions: ['Identify the pest before treating', 'Aphids: squash or water blast', 'Caterpillars: pick off by hand', 'Vine weevil: nematode drench', 'Spider mite: mist regularly, biological control'], severity: 'high' },
  { id: 'flowers-dropping', label: 'Flowers dropping off', emoji: '🌺', causes: ['Blossom drop from temperature extremes', 'Irregular watering (tomatoes, peppers)', 'Poor pollination'], actions: ['Ensure consistent watering schedule', 'Shake/tap plants gently to aid pollination', 'Avoid excessive nitrogen — promote flowering with potash feed'], severity: 'medium' },
  { id: 'fruit-rot', label: 'Fruit rotting', emoji: '🍅', causes: ['Blossom end rot (calcium issue from irregular watering)', 'Grey mould on fruit', 'Slugs eating low fruit'], actions: ['BER: maintain consistent watering, do NOT add calcium', 'Remove affected fruit promptly', 'Raise low-hanging fruit off soil with straw', 'Improve air circulation around plants'], severity: 'high' },
];

// ── Photo entry ─────────────────────────────────────────────────────────────

export interface PhotoAssessment {
  symptoms: HealthSymptom[];
  notes: string;
  assessedAt: string; // ISO
}

export interface GardenPhoto {
  id: string;
  /** Base64 data URL for the thumbnail (compressed) */
  thumbnailDataUrl: string;
  /** Full image stored in IndexedDB */
  hasFullImage: boolean;
  plantSlug: string | null;
  location: 'greenstalk' | 'in-ground' | 'conservatory' | 'general';
  capturedAt: string; // ISO
  assessment: PhotoAssessment | null;
  /** Action items generated from assessment */
  actions: string[];
}

// ── IndexedDB helpers ───────────────────────────────────────────────────────

const DB_NAME = 'garden-plotter-photos';
const STORE_NAME = 'images';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeImage(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getImage(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteImage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Thumbnail generation ────────────────────────────────────────────────────

function generateThumbnail(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Store ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'garden-plotter-photos-meta';

interface PhotoState {
  photos: GardenPhoto[];
  addPhoto: (file: File, plantSlug: string | null, location: GardenPhoto['location']) => Promise<string>;
  removePhoto: (id: string) => Promise<void>;
  updateAssessment: (id: string, assessment: PhotoAssessment) => void;
  getFullImage: (id: string) => Promise<string | null>;
}

function loadMeta(): GardenPhoto[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMeta(photos: GardenPhoto[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
}

export const usePhotoStore = create<PhotoState>((set, get) => ({
  photos: loadMeta(),

  addPhoto: async (file, plantSlug, location) => {
    const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const thumbnailDataUrl = await generateThumbnail(file);
    await storeImage(id, file);

    const photo: GardenPhoto = {
      id,
      thumbnailDataUrl,
      hasFullImage: true,
      plantSlug,
      location,
      capturedAt: new Date().toISOString(),
      assessment: null,
      actions: [],
    };

    set((state) => {
      const photos = [photo, ...state.photos];
      saveMeta(photos);
      return { photos };
    });
    return id;
  },

  removePhoto: async (id) => {
    await deleteImage(id).catch(() => {});
    set((state) => {
      const photos = state.photos.filter((p) => p.id !== id);
      saveMeta(photos);
      return { photos };
    });
  },

  updateAssessment: (id, assessment) => {
    set((state) => {
      const photos = state.photos.map((p) => {
        if (p.id !== id) return p;
        // Generate action items from symptoms
        const actions: string[] = [];
        for (const symptomId of assessment.symptoms) {
          const info = SYMPTOM_LIBRARY.find((s) => s.id === symptomId);
          if (info && info.id !== 'healthy') {
            actions.push(...info.actions.slice(0, 2)); // Top 2 actions per symptom
          }
        }
        return { ...p, assessment, actions: [...new Set(actions)] };
      });
      saveMeta(photos);
      return { photos };
    });
  },

  getFullImage: async (id) => {
    const blob = await getImage(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },
}));
