/* ------------------------------------------------------------------ */
/*  Custom structured logger + audit trail (no Sentry, by design).     */
/*  Owns its own persistence so it works before/without the DB.        */
/* ------------------------------------------------------------------ */

import type { AuditEntry, LogLevel } from "../types";
import { uid } from "./utils";

const KEY = "volt_audit_v1";
const MAX_ENTRIES = 300;

const LEVEL_STYLE: Record<LogLevel, string> = {
  DEBUG: "color:#8a9ba0;font-weight:700",
  INFO: "color:#0fa8a0;font-weight:700",
  WARN: "color:#d08700;font-weight:700",
  SECURITY: "color:#d64545;font-weight:700",
};

class Logger {
  private entries: AuditEntry[] = [];
  private listeners = new Set<() => void>();

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.entries = JSON.parse(raw) as AuditEntry[];
    } catch {
      this.entries = [];
    }
  }

  log(level: LogLevel, action: string, actor = "system", detail = "") {
    const entry: AuditEntry = { id: uid("log"), at: Date.now(), level, actor, action, detail };
    this.entries.unshift(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.entries));
    } catch {
      /* storage full — audit continues in memory */
    }
    // eslint-disable-next-line no-console
    console.log(`%c[VOLT:${level}]%c ${action} %c${detail}`, LEVEL_STYLE[level], "color:inherit;font-weight:600", "color:#8a9ba0");
    this.listeners.forEach((fn) => fn());
  }

  debug(action: string, actor?: string, detail?: string) {
    this.log("DEBUG", action, actor, detail);
  }
  info(action: string, actor?: string, detail?: string) {
    this.log("INFO", action, actor, detail);
  }
  warn(action: string, actor?: string, detail?: string) {
    this.log("WARN", action, actor, detail);
  }
  security(action: string, actor?: string, detail?: string) {
    this.log("SECURITY", action, actor, detail);
  }

  list(): AuditEntry[] {
    return [...this.entries];
  }

  byLevel(level: LogLevel): AuditEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  clear(actor: string) {
    this.entries = [];
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
    this.log("WARN", "AUDIT_CLEARED", actor);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const logger = new Logger();
