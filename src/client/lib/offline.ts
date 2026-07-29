import { openDB, type IDBPDatabase } from "idb";
import type { CreateInspection, Inspection } from "@validators";
import { ApiError, apiFetch } from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// Bounded offline support: queue the two writes (create + resolve) in IndexedDB,
// reflect them optimistically, and replay them through apiFetch on reconnect.
// The server upserts on the client-generated id, so replays are idempotent.
// Everything degrades to a no-op if IndexedDB is unavailable — online behavior is
// never affected.
// ─────────────────────────────────────────────────────────────────────────────

interface CreateOp {
  id: string; // queue op id
  kind: "create";
  row: Inspection; // the optimistic row (row.id is the inspection id)
}
interface ResolveOp {
  id: string;
  kind: "resolve";
  inspectionId: string;
  note: string;
}
type QueueOp = CreateOp | ResolveOp;

const DB_NAME = "qit-offline";
const QUEUE_STORE = "queue";
const CACHE_STORE = "cache";
const LIST_KEY = "last-list";

let dbPromise: Promise<IDBPDatabase> | null = null;
function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        db.createObjectStore(CACHE_STORE);
      },
    });
  }
  return dbPromise;
}

// In-memory mirror of the queue for synchronous reads from the UI.
let ops: QueueOp[] = [];
let onFlushed: (() => void) | null = null;

const listeners = new Set<() => void>();
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function notify(): void {
  for (const l of listeners) l();
}

export function setOnFlushed(cb: () => void): void {
  onFlushed = cb;
}

// Loads any persisted ops into memory. Safe to call repeatedly.
export async function initOffline(): Promise<void> {
  try {
    const db = await getDB();
    ops = (await db.getAll(QUEUE_STORE)) as QueueOp[];
    notify();
  } catch {
    ops = [];
  }
}

async function persist(op: QueueOp): Promise<void> {
  ops = [...ops, op];
  notify();
  try {
    const db = await getDB();
    await db.put(QUEUE_STORE, op);
  } catch {
    // IndexedDB unavailable — the op still lives in memory for this session.
  }
}

async function removeOp(opId: string): Promise<void> {
  ops = ops.filter((o) => o.id !== opId);
  notify();
  try {
    const db = await getDB();
    await db.delete(QUEUE_STORE, opId);
  } catch {
    // ignore
  }
}

function uuid(): string {
  return crypto.randomUUID();
}

function optimisticRow(input: CreateInspection & { id: string }): Inspection {
  const now = Date.now();
  return {
    id: input.id,
    inspectionDate: input.inspectionDate,
    machineLineId: input.machineLineId,
    defectType: input.defectType,
    severity: input.severity,
    remarks: input.remarks ?? null,
    status: "open",
    resolutionNote: null,
    resolvedAt: null,
    resolvedBy: null,
    source: "manual",
    createdBy: null,
    createdAt: now,
    updatedAt: now,
  };
}

function toCreateBody(row: Inspection): CreateInspection {
  return {
    id: row.id,
    inspectionDate: row.inspectionDate,
    machineLineId: row.machineLineId,
    defectType: row.defectType,
    severity: row.severity,
    remarks: row.remarks,
  };
}

// ─── Public selectors used by the UI to overlay pending state ────────────────

export function pendingCreates(): Inspection[] {
  return ops
    .filter((o): o is CreateOp => o.kind === "create")
    .map((o) => o.row);
}

export function pendingResolveIds(): Set<string> {
  return new Set(
    ops
      .filter((o): o is ResolveOp => o.kind === "resolve")
      .map((o) => o.inspectionId),
  );
}

export function pendingCount(): number {
  return ops.length;
}

// ─── Submitters (online-first, fall back to the queue) ───────────────────────

export async function submitCreate(
  input: CreateInspection,
): Promise<{ inspection: Inspection; queued: boolean }> {
  const withId = { ...input, id: input.id ?? uuid() };

  if (navigator.onLine) {
    try {
      const row = await apiFetch<Inspection>("/inspections", {
        method: "POST",
        body: JSON.stringify(withId),
      });
      return { inspection: row, queued: false };
    } catch (err) {
      // A real validation/server error should surface; only network failures queue.
      if (err instanceof ApiError) throw err;
    }
  }

  const row = optimisticRow(withId);
  await persist({ id: uuid(), kind: "create", row });
  return { inspection: row, queued: true };
}

export async function submitResolve(
  inspectionId: string,
  note: string,
): Promise<{ inspection: Inspection | null; queued: boolean }> {
  if (navigator.onLine) {
    try {
      const row = await apiFetch<Inspection>(
        `/inspections/${inspectionId}/resolve`,
        { method: "PATCH", body: JSON.stringify({ resolutionNote: note }) },
      );
      return { inspection: row, queued: false };
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  }

  await persist({ id: uuid(), kind: "resolve", inspectionId, note });
  return { inspection: null, queued: true };
}

// ─── Sync engine ─────────────────────────────────────────────────────────────

let flushing = false;

export async function flush(): Promise<void> {
  if (flushing || ops.length === 0) return;
  flushing = true;
  try {
    // FIFO so a create is replayed before a resolve that targets it.
    for (const op of [...ops]) {
      try {
        if (op.kind === "create") {
          await apiFetch("/inspections", {
            method: "POST",
            body: JSON.stringify(toCreateBody(op.row)),
          });
        } else {
          await apiFetch(`/inspections/${op.inspectionId}/resolve`, {
            method: "PATCH",
            body: JSON.stringify({ resolutionNote: op.note }),
          });
        }
        await removeOp(op.id);
      } catch (err) {
        if (err instanceof ApiError) {
          // 401 → session gone; keep the op queued and stop (spec: don't drop).
          if (err.status === 401) break;
          // 409 already-resolved / 404 gone / 422 → op is dead; drop and continue.
          await removeOp(op.id);
          continue;
        }
        // Network error → stop and retry on the next reconnect.
        break;
      }
    }
  } finally {
    flushing = false;
    onFlushed?.();
    notify();
  }
}

// ─── List cache for offline reads ────────────────────────────────────────────

export async function cacheList(rows: Inspection[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put(CACHE_STORE, rows, LIST_KEY);
  } catch {
    // ignore
  }
}

export async function readCachedList(): Promise<Inspection[]> {
  try {
    const db = await getDB();
    return ((await db.get(CACHE_STORE, LIST_KEY)) as Inspection[]) ?? [];
  } catch {
    return [];
  }
}
