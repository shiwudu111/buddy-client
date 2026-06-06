import { sys } from "cc";

type DevActionLevel = "info" | "warn" | "error";
type HeaderProvider = () => string | null;

export type DevActionEntry = {
  id: number;
  at: string;
  level: DevActionLevel;
  action: string;
  detail?: string;
};

const STORAGE_KEY = "buddy.dev.actionLog";
const MAX_ENTRIES = 120;
const MAX_DETAIL_LENGTH = 1200;

function nowLabel(): string {
  const date = new Date();
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function sanitizeDetail(detail: unknown): string | undefined {
  if (detail === undefined || detail === null) {
    return undefined;
  }

  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  return text
    .replace(/password["']?\s*[:=]\s*["']?[^"',\s}]+/gi, "password:<hidden>")
    .replace(/token["']?\s*[:=]\s*["']?[^"',\s}]+/gi, "token:<hidden>")
    .slice(0, MAX_DETAIL_LENGTH);
}

class DevActionLogger {
  private nextId = 1;
  private hooksInstalled = false;
  private entries: DevActionEntry[] = [];
  private headerProvider: HeaderProvider | null = null;

  constructor() {
    this.entries = this.readStoredEntries();
    this.nextId = this.entries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0) + 1;
    this.installErrorHooks();
  }

  info(action: string, detail?: unknown): void {
    this.append("info", action, detail);
  }

  warn(action: string, detail?: unknown): void {
    this.append("warn", action, detail);
  }

  error(action: string, detail?: unknown): void {
    this.append("error", action, detail);
  }

  getEntries(): DevActionEntry[] {
    return [...this.entries];
  }

  getCount(): number {
    return this.entries.length;
  }

  setHeaderProvider(provider: HeaderProvider | null): void {
    this.headerProvider = provider;
  }

  private readStoredEntries(): DevActionEntry[] {
    try {
      const raw = sys.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const entries = JSON.parse(raw) as DevActionEntry[];
      return Array.isArray(entries) ? entries : [];
    } catch {
      try {
        sys.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage failures; runtime logging must never crash gameplay.
      }
      return [];
    }
  }

  clear(): void {
    this.entries = [];
    try {
      sys.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures; runtime logging must never crash gameplay.
    }
    this.info("devLog.clear");
  }

  formatRecent(limit = 8, offset = 0): string {
    const entries = this.getEntries().reverse().slice(offset, offset + limit);
    return this.formatEntries(entries);
  }

  formatAll(): string {
    return this.formatEntries(this.getEntries().reverse());
  }

  private formatEntries(entries: DevActionEntry[]): string {
    const header = this.headerProvider?.();
    const body =
      entries.length === 0
        ? "No action logs yet"
        : entries
            .map((entry) => {
              const marker = entry.level === "error" ? "!! " : entry.level === "warn" ? "! " : "";
              const prefix = `${marker}#${entry.id} [${entry.at}] ${entry.level.toUpperCase()} ${entry.action}`;
              return entry.detail ? `${prefix}\n  ${entry.detail}` : prefix;
            })
            .join("\n");

    return header ? `${header}\n${body}` : body;
  }

  private append(level: DevActionLevel, action: string, detail?: unknown): void {
    const sanitizedDetail = sanitizeDetail(detail);
    const entry = {
      id: this.nextId++,
      at: nowLabel(),
      level,
      action,
      detail: sanitizedDetail,
    };
    this.entries = [...this.entries, entry].slice(-MAX_ENTRIES);
    try {
      sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // Ignore storage failures; runtime logging must never crash gameplay.
    }
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      `[BuddyDevLog] ${entry.at} ${entry.level.toUpperCase()} ${entry.action}`,
      entry.detail ?? ""
    );
  }

  private installErrorHooks(): void {
    if (this.hooksInstalled) {
      return;
    }
    this.hooksInstalled = true;

    const globalObject = globalThis as {
      addEventListener?: (
        type: string,
        listener: (event: { message?: string; reason?: unknown }) => void
      ) => void;
    };

    globalObject.addEventListener?.("error", (event) => {
      this.error("runtime.error", event.message ?? "unknown error");
    });
    globalObject.addEventListener?.("unhandledrejection", (event) => {
      const reason = event.reason instanceof Error ? event.reason.message : event.reason;
      this.error("runtime.unhandledRejection", reason ?? "unknown rejection");
    });
  }
}

export const devActionLogger = new DevActionLogger();
