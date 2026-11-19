import type { SaleItem, SaleProgram } from "../data/repositories/types";
import { normalizeSaleItemName, normalizeSaleProgram, uniqueSaleItemId } from "./sale";

const STORAGE_KEY = "vf_sale_programs_v2";
const LEGACY_KEY = "vf_sale_programs_v1";

type StoreState = {
  programs: SaleProgram[];
  customItems: SaleItem[];
};

/**
 * Write-side adapter used by the sale program editor.
 *
 * The current implementation is localStorage-backed for the static demo.
 * A DB-backed implementation only needs to provide this interface; the
 * editor does not know where data is stored.
 */
export interface SaleProgramStore {
  loadProgram(productId: string): Promise<SaleProgram | null>;
  saveProgram(program: SaleProgram): Promise<void>;
  resetProgram(productId: string): Promise<void>;
  listCustomItems(): Promise<SaleItem[]>;
  saveCustomItems(items: SaleItem[]): Promise<void>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseStoredState(raw: unknown): StoreState | null {
  const record = asRecord(raw);
  if (!record) return null;

  const programs = Array.isArray(record.programs)
    ? record.programs.flatMap((program) => {
        const programRecord = asRecord(program);
        const productId = String(programRecord?.productId ?? "").trim();
        if (!programRecord || !productId) return [];
        return [normalizeSaleProgram(programRecord, productId)];
      })
    : [];

  const customItems = Array.isArray(record.customItems)
    ? record.customItems.flatMap((item) => {
        const itemRecord = asRecord(item);
        const id = String(itemRecord?.id ?? "").trim();
        const name = String(itemRecord?.name ?? "").trim();
        if (!id || !name) return [];
        return [{ id, name }];
      })
    : [];

  return { programs, customItems };
}

/**
 * Convert the previous shape (`additionalItems: [{ name, note }]`) into
 * catalog references, creating custom catalog rows for unknown names.
 */
function migrateLegacyState(raw: unknown, seedItems: SaleItem[]): StoreState {
  const record = asRecord(raw);
  if (!record) return { programs: [], customItems: [] };

  const byName = new Map(seedItems.map((item) => [normalizeSaleItemName(item.name), item]));
  const usedIds = new Set(seedItems.map((item) => item.id));
  const customItems: SaleItem[] = [];
  const programs: SaleProgram[] = [];

  for (const [productId, value] of Object.entries(record)) {
    const programRecord = asRecord(value);
    if (!programRecord) continue;

    const legacyItems = Array.isArray(programRecord.additionalItems)
      ? programRecord.additionalItems
      : [];
    const items = legacyItems.flatMap((legacy) => {
      const legacyRecord = asRecord(legacy);
      const name = String(legacyRecord?.name ?? "").trim();
      if (!name) return [];

      let catalogItem = byName.get(normalizeSaleItemName(name));
      if (!catalogItem) {
        catalogItem = {
          id: uniqueSaleItemId(name, usedIds),
          name,
        };
        byName.set(normalizeSaleItemName(name), catalogItem);
        customItems.push(catalogItem);
      }

      return [{ itemId: catalogItem.id, note: String(legacyRecord?.note ?? "").trim() }];
    });

    programs.push(normalizeSaleProgram({ ...programRecord, items }, productId));
  }

  return { programs, customItems };
}

function readLocal(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / blocked storage: the in-memory state still works for the session.
  }
}

export function createLocalSaleProgramStore(seedItems: SaleItem[]): SaleProgramStore {
  let memory: StoreState | null = null;

  function read(): StoreState {
    if (memory) return memory;

    const stored = parseStoredState(readLocal(STORAGE_KEY));
    if (stored) {
      memory = stored;
      return memory;
    }

    const legacy = readLocal(LEGACY_KEY);
    if (legacy) {
      memory = migrateLegacyState(legacy, seedItems);
      writeLocal(STORAGE_KEY, memory);
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        // Ignore blocked storage; the migrated data is already in memory.
      }
      return memory;
    }

    memory = { programs: [], customItems: [] };
    return memory;
  }

  function write(state: StoreState): void {
    memory = state;
    writeLocal(STORAGE_KEY, state);
  }

  return {
    async loadProgram(productId: string): Promise<SaleProgram | null> {
      const program = read().programs.find((row) => row.productId === productId);
      return program ? clone(program) : null;
    },

    async saveProgram(program: SaleProgram): Promise<void> {
      const state = read();
      const programs = state.programs.filter((row) => row.productId !== program.productId);
      programs.push(clone(program));
      write({ ...state, programs });
    },

    async resetProgram(productId: string): Promise<void> {
      const state = read();
      const programs = state.programs.filter((row) => row.productId !== productId);
      const referenced = new Set(
        programs.flatMap((program) => program.items.map((item) => item.itemId)),
      );

      write({
        programs,
        customItems: state.customItems.filter((item) => referenced.has(item.id)),
      });
    },

    async listCustomItems(): Promise<SaleItem[]> {
      return clone(read().customItems);
    },

    async saveCustomItems(items: SaleItem[]): Promise<void> {
      const state = read();
      write({ ...state, customItems: clone(items) });
    },
  };
}
