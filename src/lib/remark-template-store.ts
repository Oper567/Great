import fs from "fs";
import path from "path";
import prisma, { queryRawPg } from "@/lib/prisma";
import {
  DEFAULT_REMARK_TEMPLATES,
  PerformanceRemarkTemplateTier,
  normalizeRemarkTemplates,
} from "@/lib/remark-templates";

const DATA_DIR = path.join(process.cwd(), "database");
const STORE_PATH = path.join(DATA_DIR, "remark-templates-store.json");
const SETTING_KEY = "terminal_remark_templates";

declare global {
  // eslint-disable-next-line no-var
  var __gfmsRemarkTemplatesCache: PerformanceRemarkTemplateTier[] | undefined;
}

async function ensureSettingsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "app_settings" (
      "setting_key" TEXT PRIMARY KEY,
      "setting_value" TEXT NOT NULL,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function readLocalTemplatesFallback(): PerformanceRemarkTemplateTier[] | null {
  try {
    if (!fs.existsSync(STORE_PATH)) return null;
    const raw = fs.readFileSync(STORE_PATH, "utf-8").trim();
    if (!raw) return null;
    return normalizeRemarkTemplates(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalTemplatesFallback(templates: PerformanceRemarkTemplateTier[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(templates, null, 2), "utf-8");
  } catch {
    // Non-fatal fallback
  }
}

/**
 * Loads Admin's saved Performance Remark Templates across PostgreSQL and local cache/store.
 * Always falls back cleanly to DEFAULT_REMARK_TEMPLATES.
 */
export async function getServerRemarkTemplates(): Promise<PerformanceRemarkTemplateTier[]> {
  if (Array.isArray(global.__gfmsRemarkTemplatesCache) && global.__gfmsRemarkTemplatesCache.length > 0) {
    return global.__gfmsRemarkTemplatesCache.map((t) => ({ ...t }));
  }

  try {
    await ensureSettingsTable();
    const rows = await queryRawPg(
      `SELECT setting_value FROM app_settings WHERE setting_key = $1 LIMIT 1`,
      [SETTING_KEY]
    );
    if (rows && rows.length > 0 && rows[0]?.setting_value) {
      const normalized = normalizeRemarkTemplates(JSON.parse(rows[0].setting_value));
      global.__gfmsRemarkTemplatesCache = normalized;
      return normalized.map((t) => ({ ...t }));
    }
  } catch {
    // DB unavailable locally or offline: try local fallback below
  }

  const localStored = readLocalTemplatesFallback();
  if (localStored) {
    global.__gfmsRemarkTemplatesCache = localStored;
    return localStored.map((t) => ({ ...t }));
  }

  return DEFAULT_REMARK_TEMPLATES.map((t) => ({ ...t }));
}

/**
 * Persists edited Performance Remark Templates into PostgreSQL `app_settings`
 * and updates RAM cache + local JSON fallback.
 */
export async function saveServerRemarkTemplates(
  templates: PerformanceRemarkTemplateTier[]
): Promise<PerformanceRemarkTemplateTier[]> {
  const normalized = normalizeRemarkTemplates(templates);
  const jsonPayload = JSON.stringify(normalized);

  global.__gfmsRemarkTemplatesCache = normalized;
  writeLocalTemplatesFallback(normalized);

  try {
    await ensureSettingsTable();
    await queryRawPg(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [SETTING_KEY, jsonPayload]
    );
  } catch {
    // Local fallback + cache already persisted
  }

  return normalized.map((t) => ({ ...t }));
}
