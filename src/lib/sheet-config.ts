/*
 * Runtime Google Sheet configuration.
 *
 * The build-time values (PUBLIC_* in .env or GitHub Actions variables) are the
 * default. The /cau-hinh/ page can override them per browser with localStorage,
 * which is handy for a demo against a personal Sheet without rebuilding.
 */

export type LeadTransport = "sheet" | "api";
export type ConfigSource = "config" | "env" | "demo";

export interface SheetConfig {
  endpoint: string;
  sheetUrl: string;
  transport: LeadTransport;
  logEvents: boolean;
  updatedAt: string;
}

export interface LeadTarget {
  kind: "sheet" | "api" | "demo";
  endpoint: string;
  source: ConfigSource;
}

export interface SubmissionLogEntry {
  at: string;
  mode: "sheet" | "api" | "demo";
  source: ConfigSource;
  endpoint: string;
  formType: string;
  fullName: string;
  phone: string;
  leadId?: string;
  duplicate?: boolean;
}

export interface WorkerSettings {
  workerName: string;
  workersSubdomain: string;
  productionOrigins: string[];
  updatedAt: string;
}

export const SHEET_CONFIG_KEY = "vf_demo_sheet_config";
export const WORKER_SETTINGS_KEY = "vf_demo_worker_settings";
export const SUBMISSION_LOG_KEY = "vf_demo_submission_log";
export const SHEET_CONFIG_EVENT = "vf:sheet-config";
export const DEMO_LEADS_KEY = "vf_demo_leads";

const MAX_LOG_ENTRIES = 40;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function envText(value: string | undefined): string {
  return text(value);
}

/* ---------------- Endpoint helpers ---------------- */

export function normalizeEndpoint(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function isLocalEndpoint(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]")
    );
  } catch {
    return false;
  }
}

export function isAppsScriptEndpoint(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "script.google.com" && parsed.pathname.includes("/macros/");
  } catch {
    return false;
  }
}

/** Returns a human-readable error, or an empty string when the endpoint is usable. */
export function endpointError(value: string): string {
  const raw = text(value);
  if (!raw) return "Vui lòng nhập URL endpoint (Cloudflare Worker .../lead hoặc Apps Script .../exec).";

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "URL không hợp lệ. Ví dụ: https://vinfast-lead-api.abc.workers.dev/lead";
  }

  if (parsed.hostname === "docs.google.com" || parsed.hostname === "drive.google.com") {
    return "Đây là link Google Sheet/Drive. Hãy dán URL endpoint của Worker hoặc Apps Script.";
  }

  if (parsed.protocol !== "https:" && !isLocalEndpoint(raw)) {
    return "Chỉ chấp nhận https:// (hoặc http://localhost khi test local).";
  }

  if (parsed.hostname === "script.google.com" && !parsed.pathname.endsWith("/exec")) {
    return "URL Apps Script phải kết thúc bằng /exec (không phải /dev).";
  }

  return "";
}

export function validateEndpoint(value: string): { ok: boolean; endpoint: string; error: string } {
  const endpoint = normalizeEndpoint(value);
  if (!endpoint) {
    return { ok: false, endpoint: "", error: endpointError(value) };
  }
  const error = endpointError(value);
  return { ok: !error, endpoint, error };
}

/* ---------------- Worker setup helpers ---------------- */

export function normalizeOrigin(value: unknown): string {
  const raw = text(value).replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    if (parsed.pathname !== "/" && parsed.pathname !== "") return "";
    if (parsed.search || parsed.hash) return "";
    if (parsed.protocol === "http:" && !isLocalEndpoint(raw)) return "";
    return parsed.origin;
  } catch {
    return "";
  }
}

export function originError(value: string): string {
  const raw = text(value);
  if (!raw) return "Vui lòng nhập origin của website khi deploy.";
  if (!normalizeOrigin(raw)) {
    return "Origin chỉ gồm scheme + host + port, không có path/query. Ví dụ: https://yourname.github.io";
  }
  return "";
}

export function parseOrigins(value: string): string[] {
  const list = text(value)
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
  return Array.from(new Set(list));
}

export function workerNameError(value: string): string {
  const name = text(value);
  if (!name) return "Vui lòng nhập tên Worker, ví dụ: vinfast-lead-api.";
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(name)) {
    return "Tên Worker chỉ gồm chữ, số và dấu gạch nối, tối đa 63 ký tự.";
  }
  return "";
}

export function workersSubdomainError(value: string): string {
  const subdomain = text(value);
  if (!subdomain) return "";
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)) {
    return "Subdomain chỉ gồm chữ, số và dấu gạch nối (không có dấu chấm).";
  }
  return "";
}

export function buildAllowedOrigins(productionOrigins: string[]): string {
  const list = ["http://localhost:4321", "http://127.0.0.1:4321", ...productionOrigins]
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
  return Array.from(new Set(list)).join(",");
}

export function buildSuggestedWorkerEndpoint(settings: Pick<WorkerSettings, "workerName" | "workersSubdomain">): string {
  const name = text(settings.workerName);
  const subdomain = text(settings.workersSubdomain);
  if (!name || !subdomain) return "";
  return `https://${name}.${subdomain}.workers.dev/lead`;
}

/* ---------------- Build-time defaults ---------------- */

export function getEnvDefaults(): {
  sheet: string;
  api: string;
  event: string;
  workerName: string;
  workersSubdomain: string;
  productionOrigin: string;
} {
  return {
    sheet: envText(import.meta.env.PUBLIC_SHEET_ENDPOINT),
    api: envText(import.meta.env.PUBLIC_API_ENDPOINT),
    event: envText(import.meta.env.PUBLIC_EVENT_ENDPOINT),
    workerName: envText(import.meta.env.PUBLIC_WORKER_NAME),
    workersSubdomain: envText(import.meta.env.PUBLIC_WORKERS_SUBDOMAIN),
    productionOrigin: envText(import.meta.env.PUBLIC_PRODUCTION_ORIGIN),
  };
}

/* ---------------- Stored configuration ---------------- */

function storageAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readSheetConfig(): SheetConfig | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(SHEET_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SheetConfig>;
    const endpoint = normalizeEndpoint(parsed.endpoint);
    if (!endpoint) return null;
    return {
      endpoint,
      sheetUrl: normalizeEndpoint(parsed.sheetUrl),
      transport: parsed.transport === "api" ? "api" : "sheet",
      logEvents: parsed.logEvents !== false,
      updatedAt: text(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

export function saveSheetConfig(input: Omit<SheetConfig, "updatedAt">): SheetConfig | null {
  if (!storageAvailable()) return null;
  const endpoint = normalizeEndpoint(input.endpoint);
  if (!endpoint || endpointError(input.endpoint)) return null;

  const next: SheetConfig = {
    endpoint,
    sheetUrl: normalizeEndpoint(input.sheetUrl),
    transport: input.transport === "api" ? "api" : "sheet",
    logEvents: input.logEvents !== false,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(next));
  } catch {
    return null;
  }
  dispatchConfigChange();
  return next;
}

export function clearSheetConfig(): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(SHEET_CONFIG_KEY);
  } catch {
    // Storage can be unavailable in private mode.
  }
  dispatchConfigChange();
}

export function readWorkerSettings(): WorkerSettings | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(WORKER_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkerSettings>;
    const workerName = text(parsed.workerName);
    if (!workerName || workerNameError(workerName)) return null;
    const workersSubdomain = text(parsed.workersSubdomain);
    if (workersSubdomainError(workersSubdomain)) return null;
    const productionOrigins = Array.isArray(parsed.productionOrigins)
      ? parsed.productionOrigins.map((item) => normalizeOrigin(item)).filter(Boolean)
      : [];
    return {
      workerName,
      workersSubdomain,
      productionOrigins: Array.from(new Set(productionOrigins)),
      updatedAt: text(parsed.updatedAt),
    };
  } catch {
    return null;
  }
}

export function saveWorkerSettings(input: Omit<WorkerSettings, "updatedAt">): WorkerSettings | null {
  if (!storageAvailable()) return null;
  const workerName = text(input.workerName);
  if (!workerName || workerNameError(workerName)) return null;
  const workersSubdomain = text(input.workersSubdomain);
  if (workersSubdomainError(workersSubdomain)) return null;

  const productionOrigins = Array.from(
    new Set((input.productionOrigins || []).map((item) => normalizeOrigin(item)).filter(Boolean)),
  );

  const next: WorkerSettings = {
    workerName,
    workersSubdomain,
    productionOrigins,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(WORKER_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    return null;
  }
  dispatchConfigChange();
  return next;
}

export function clearWorkerSettings(): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(WORKER_SETTINGS_KEY);
  } catch {
    // Storage can be unavailable in private mode.
  }
  dispatchConfigChange();
}

export function dispatchConfigChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHEET_CONFIG_EVENT));
}

/* ---------------- Resolution ---------------- */

export function resolveLeadTarget(): LeadTarget {
  const stored = readSheetConfig();
  if (stored) {
    return { kind: stored.transport, endpoint: stored.endpoint, source: "config" };
  }

  const env = getEnvDefaults();
  if (env.api) return { kind: "api", endpoint: env.api, source: "env" };
  if (env.sheet) return { kind: "sheet", endpoint: env.sheet, source: "env" };
  return { kind: "demo", endpoint: "", source: "demo" };
}

export function resolveEventEndpoint(): string {
  const stored = readSheetConfig();
  if (stored) return stored.logEvents ? stored.endpoint : "";

  const env = getEnvDefaults();
  return env.event || env.api || env.sheet;
}

export function targetLabel(target: LeadTarget): string {
  if (target.kind === "demo") return "Chế độ demo (localStorage)";
  const transport = target.kind === "api" ? "API/Worker" : "Google Sheet (Apps Script)";
  const source = target.source === "config" ? "cấu hình trình duyệt" : "biến môi trường";
  return `${transport} — ${source}`;
}

/* ---------------- Submission log (for the config page) ---------------- */

export function maskPhone(value: string): string {
  const digits = text(value).replace(/\D/g, "");
  if (digits.length < 7) return digits || "—";
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

export function readSubmissionLog(): SubmissionLogEntry[] {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SUBMISSION_LOG_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SubmissionLogEntry => {
      if (!item || typeof item !== "object") return false;
      const entry = item as Partial<SubmissionLogEntry>;
      return Boolean(entry.at && entry.mode);
    });
  } catch {
    return [];
  }
}

export function recordSubmission(entry: Omit<SubmissionLogEntry, "at" | "phone"> & { phone: string }): void {
  if (!storageAvailable()) return;
  try {
    const list = readSubmissionLog();
    list.unshift({
      ...entry,
      phone: maskPhone(entry.phone),
      at: new Date().toISOString(),
    });
    window.localStorage.setItem(SUBMISSION_LOG_KEY, JSON.stringify(list.slice(0, MAX_LOG_ENTRIES)));
  } catch {
    // A demo log is best-effort only.
  }
}

export function clearSubmissionLog(): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(SUBMISSION_LOG_KEY);
  } catch {
    // Ignore storage errors.
  }
}
