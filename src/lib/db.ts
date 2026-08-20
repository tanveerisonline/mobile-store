/* ------------------------------------------------------------------ */
/*  VoltDB — embedded document store (localStorage-backed).            */
/*  Mirrors the Prisma client surface: repositories + unit-of-work     */
/*  commits, so services can be ported to Postgres 1:1.                */
/* ------------------------------------------------------------------ */

import type { DbShape } from "../types";

const KEY = "volt_db_v1";

class VoltDB {
  private data: DbShape | null = null;
  private listeners = new Set<() => void>();

  hasPersisted(): boolean {
    return localStorage.getItem(KEY) !== null;
  }

  isReady(): boolean {
    return this.data !== null;
  }

  /** First run: hydrate with the async-built seed. */
  init(seed: DbShape) {
    this.data = seed;
    this.persist();
    this.emit();
  }

  loadPersisted() {
    const raw = localStorage.getItem(KEY);
    if (!raw) throw new Error("No persisted database found");
    this.data = JSON.parse(raw) as DbShape;
    this.emit();
  }

  get(): DbShape {
    if (!this.data) throw new Error("Database accessed before boot");
    return this.data;
  }

  /** Unit of work: mutate, then persist + notify subscribers once. */
  update(mutator: (d: DbShape) => void) {
    const d = this.get();
    mutator(d);
    this.persist();
    this.emit();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* quota exceeded — keep in-memory copy alive */
    }
  }

  /** Hard reset back to seed (used by the dashboard's danger zone). */
  wipe() {
    this.data = null;
    localStorage.removeItem(KEY);
  }

  tableStats(): { table: string; rows: number; bytes: number }[] {
    const d = this.get();
    const tables: (keyof DbShape)[] = [
      "users",
      "sessions",
      "categories",
      "products",
      "reviews",
      "orders",
      "coupons",
      "slides",
      "newsletter",
    ];
    return tables.map((t) => {
      const value = d[t];
      const rows = Array.isArray(value) ? value.length : 1;
      const bytes = new Blob([JSON.stringify(value)]).size;
      return { table: t, rows, bytes };
    });
  }
}

export const db = new VoltDB();

/* ------------------------------------------------------------------ */
/*  Generic repository (base class — Open/Closed principle).           */
/* ------------------------------------------------------------------ */

export class Repository<T extends object> {
  constructor(
    protected table: keyof DbShape,
    protected key: keyof T = "id" as keyof T
  ) {}

  protected rows(): T[] {
    return (db.get() as unknown as Record<string, T[]>)[this.table];
  }

  private keyOf(row: T): string {
    return String((row as unknown as Record<string, unknown>)[this.key as string]);
  }

  all(): T[] {
    return [...this.rows()];
  }

  find(id: string): T | null {
    return this.rows().find((r) => this.keyOf(r) === id) ?? null;
  }

  where(predicate: (row: T) => boolean): T[] {
    return this.rows().filter(predicate);
  }

  insert(item: T): T {
    db.update((d) => {
      ((d as unknown as Record<string, T[]>)[this.table] as T[]).unshift(item);
    });
    return item;
  }

  patch(id: string, patch: Partial<T>): T | null {
    db.update((d) => {
      const arr = (d as unknown as Record<string, T[]>)[this.table] as T[];
      const i = arr.findIndex((r) => this.keyOf(r) === id);
      if (i >= 0) arr[i] = { ...arr[i], ...patch };
    });
    return this.find(id);
  }

  remove(id: string): void {
    db.update((d) => {
      (d as unknown as Record<string, unknown>)[this.table] = this.rows().filter((r) => this.keyOf(r) !== id);
    });
  }

  count(predicate?: (row: T) => boolean): number {
    return predicate ? this.where(predicate).length : this.rows().length;
  }
}
