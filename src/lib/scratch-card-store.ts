import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "database");
const STORE_PATH = path.join(DATA_DIR, "scratch-cards-store.json");

declare global {
  // eslint-disable-next-line no-var
  var __gfmsScratchCardsCache: StoredScratchCardItem[] | undefined;
}

export interface StoredScratchCardItem {
  id: string;
  pin: string;
  serialNumber?: string | null;
  admNo?: string | null;
  usageCount: number;
  maxUsage: number;
  status: "active" | "exhausted";
  session?: string | null;
  term?: string | null;
  createdAt: string;
  updatedAt: string;
}

function persistScratchCardsToDisk(items: StoredScratchCardItem[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  global.__gfmsScratchCardsCache = [...items];
  fs.writeFileSync(STORE_PATH, JSON.stringify(items), "utf-8");
}

/**
 * Ensures the store exists and returns all generated scratch cards (cached in RAM)
 */
export function getLocalScratchCardsStore(): StoredScratchCardItem[] {
  if (Array.isArray(global.__gfmsScratchCardsCache)) {
    return [...global.__gfmsScratchCardsCache];
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, "[]", "utf-8");
      global.__gfmsScratchCardsCache = [];
      return [];
    }

    const data = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = data.trim() ? (JSON.parse(data) as StoredScratchCardItem[]) : [];
    global.__gfmsScratchCardsCache = Array.isArray(parsed) ? parsed : [];
    return [...global.__gfmsScratchCardsCache];
  } catch (err) {
    console.error("Failed to read local scratch cards store:", err);
    return [];
  }
}

/**
 * Overwrite all scratch cards in the local store
 */
export function saveAllToLocalScratchCardsStore(items: StoredScratchCardItem[]): void {
  try {
    persistScratchCardsToDisk(items);
  } catch (err) {
    console.error("Failed to write to local scratch cards store:", err);
  }
}

/**
 * Saves a single scratch card into the local store
 */
export function saveToLocalScratchCardsStore(card: StoredScratchCardItem): StoredScratchCardItem {
  const items = getLocalScratchCardsStore();
  const cleanPin = card.pin.trim().toUpperCase();

  const existingIdx = items.findIndex((c) => c.pin.trim().toUpperCase() === cleanPin);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    items[existingIdx] = {
      ...items[existingIdx],
      ...card,
      updatedAt: now,
    };
    saveAllToLocalScratchCardsStore(items);
    return items[existingIdx];
  } else {
    const newItem: StoredScratchCardItem = {
      ...card,
      pin: cleanPin,
      createdAt: card.createdAt || now,
      updatedAt: now,
    };
    items.unshift(newItem);
    saveAllToLocalScratchCardsStore(items);
    return newItem;
  }
}

/**
 * Finds a scratch card by its exact PIN (case-insensitive)
 */
export function findInLocalScratchCardsStore(pin: string): StoredScratchCardItem | null {
  const items = getLocalScratchCardsStore();
  const cleanPin = pin.trim().toUpperCase();
  const found = items.find((c) => c.pin.trim().toUpperCase() === cleanPin);
  return found || null;
}

/**
 * Updates a scratch card's usage, lock, or status in the local store
 */
export function updateInLocalScratchCardsStore(
  pin: string,
  updates: Partial<StoredScratchCardItem>
): StoredScratchCardItem | null {
  const items = getLocalScratchCardsStore();
  const cleanPin = pin.trim().toUpperCase();
  const idx = items.findIndex((c) => c.pin.trim().toUpperCase() === cleanPin);

  if (idx < 0) return null;

  items[idx] = {
    ...items[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveAllToLocalScratchCardsStore(items);
  return items[idx];
}

/**
 * Deletes a scratch card from the local store
 */
export function deleteFromLocalScratchCardsStore(idOrPin: string): boolean {
  try {
    const items = getLocalScratchCardsStore();
    const cleanTarget = idOrPin.trim().toUpperCase();
    const filtered = items.filter(
      (c) => c.id !== idOrPin && c.pin.trim().toUpperCase() !== cleanTarget
    );
    saveAllToLocalScratchCardsStore(filtered);
    return true;
  } catch (err) {
    console.error("Failed to delete from local scratch cards store:", err);
    return false;
  }
}
